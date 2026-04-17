import mongoose from "mongoose";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Session } from "../models/Session.js";
import {
    buildRefreshSessionToken,
    createSessionSecret,
    getRefreshSessionExpiryDate,
    hashSessionSecret,
    parseRefreshSessionToken,
} from "../utils/sessionTokens.js";

import {
    buildGoogleAuthUrl,
    createOAuthState,
    exchangeGoogleCode,
    fetchGoogleProfile,
    getOAuthStateCookieOptions,
} from "../utils/oauth.js";


const getRefreshCookieOptions = () => {
    const secure =
        process.env.COOKIE_SECURE !== undefined
            ? process.env.COOKIE_SECURE.trim().toLowerCase() === "true"
            : process.env.NODE_ENV === "production";

    const sameSite =
        process.env.COOKIE_SAME_SITE?.trim().toLowerCase() ||
        (secure ? "none" : "lax");

    return {
        httpOnly: true,
        secure,
        sameSite,
    };
};

const isTrue = (value) => String(value).trim().toLowerCase() === "true";

const buildFrontendOAuthRedirect = (status, error = "") => {
    const url = new URL("/oauth/callback", process.env.FRONTEND_URL);

    url.searchParams.set("status", status);
    url.searchParams.set("provider", "google");

    if (error) {
        url.searchParams.set("error", error);
    }

    return url.toString();
};

const getSafeOAuthName = (name, email) => {
    const normalizedName = typeof name === "string" ? name.trim() : "";

    if (normalizedName.length >= 3) {
        return normalizedName.slice(0, 50);
    }

    const emailPrefix = typeof email === "string" ? email.split("@")[0].trim() : "";

    if (emailPrefix.length >= 3) {
        return emailPrefix.slice(0, 50);
    }

    return "BugSense User";
};

const getRequestMetadata = (req) => {
    return {
        userAgent: req.get("user-agent") || "",
        ipAddress: req.ip || req.socket?.remoteAddress || "",
    };
};

const getCurrentSessionId = (req) => {
    const parsedToken = parseRefreshSessionToken(req.cookies?.refreshToken);
    return parsedToken?.sessionId || null;
};

const serializeSession = (session, currentSessionId) => ({
    _id: session._id.toString(),
    userAgent: session.userAgent || "",
    ipAddress: session.ipAddress || "",
    lastUsedAt: session.lastUsedAt,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    isCurrent: currentSessionId === session._id.toString(),
});

const createSessionForUser = async (userId, req) => {
    const secret = createSessionSecret();
    const expiresAt = getRefreshSessionExpiryDate();
    const { userAgent, ipAddress } = getRequestMetadata(req);

    const session = await Session.create({
        user: userId,
        tokenHash: hashSessionSecret(secret),
        userAgent,
        ipAddress,
        lastUsedAt: new Date(),
        expiresAt,
    });

    return {
        session,
        refreshToken: buildRefreshSessionToken(session._id.toString(), secret),
    };
};

const findOrCreateGoogleUser = async ({ googleId, email, name }) => {
    let user = await User.findOne({ googleId });

    if (user) {
        return user;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingEmailUser = await User.findOne({ email: normalizedEmail });

    if (existingEmailUser) {
        throw new ApiError(
            409,
            "An account with this email already exists. Sign in with password first."
        );
    }

    user = await User.create({
        name: getSafeOAuthName(name, normalizedEmail),
        email: normalizedEmail,
        googleId,
    });

    return user;
};

const startGoogleAuth = asyncHandler(async (req, res) => {
    if (!isTrue(process.env.GOOGLE_OAUTH_ENABLED)) {
        throw new ApiError(404, "Google OAuth is not enabled");
    }

    const state = createOAuthState();

    return res
        .cookie("oauth_state_google", state, getOAuthStateCookieOptions())
        .redirect(buildGoogleAuthUrl(state));
});

const handleGoogleCallback = asyncHandler(async (req, res) => {
    if (!isTrue(process.env.GOOGLE_OAUTH_ENABLED)) {
        throw new ApiError(404, "Google OAuth is not enabled");
    }

    const { code, state } = req.query;
    const storedState = req.cookies?.oauth_state_google;

    if (
        typeof code !== "string" ||
        typeof state !== "string" ||
        !storedState ||
        state !== storedState
    ) {
        res.clearCookie("oauth_state_google", getOAuthStateCookieOptions());
        return res.redirect(buildFrontendOAuthRedirect("error", "invalid_state"));
    }

    res.clearCookie("oauth_state_google", getOAuthStateCookieOptions());

    try {
        const tokenData = await exchangeGoogleCode(code);
        const profile = await fetchGoogleProfile(tokenData.access_token);

        if (
            typeof profile?.sub !== "string" ||
            typeof profile?.email !== "string" ||
            profile.email_verified !== true
        ) {
            return res.redirect(buildFrontendOAuthRedirect("error", "unverified_email"));
        }

        const user = await findOrCreateGoogleUser({
            googleId: profile.sub,
            email: profile.email,
            name: profile.name,
        });

        const { refreshToken } = await createSessionForUser(user._id, req);

        return res
            .cookie("refreshToken", refreshToken, getRefreshCookieOptions())
            .redirect(buildFrontendOAuthRedirect("success"));
    } catch (error) {
        if (error instanceof ApiError && error.statusCode === 409) {
            return res.redirect(buildFrontendOAuthRedirect("error", "email_exists"));
        }

        return res.redirect(buildFrontendOAuthRedirect("error", "oauth_failed"));
    }
});

const registerUser = asyncHandler( async (req, res) => {

    // destructuring data that is sent from the client
    const { name, email, password } = req.body;


    // validation of each field
    if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        name.trim() === "" ||
        email.trim() === "" ||
        password.trim() === ""
    ) {
        throw new ApiError(400, "All fields are required");
    }

    if (/\s/.test(password)) {
        throw new ApiError(400, "Password cannot contain spaces");
    }


    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();


    // check if user already exists
    const existingUser = await User.findOne({email : normalizedEmail})
    if(existingUser){
        throw new ApiError(409, "Email already exists");
    }

    
    // create new user
    const user = await User.create({
        name: normalizedName,
        email : normalizedEmail,
        passwordHash : password
    });

    if(!user){
        throw new ApiError(500, "User registration failed");
    }

    // removing important data from response
    const createdUser = await User.findById(user._id).select(
        "-passwordHash"
    )


    // return reponse
    return res.status(201).json(
        new ApiResponse(createdUser, "User registered successfully")
    )
});

const loginUser = asyncHandler( async(req, res) => {

    // destructuring data from the req
    const { email, password } = req.body;

    // validation of each field
    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        email.trim() === "" ||
        password.trim() === ""
    ) {
        throw new ApiError(400, "Email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();


    // find user by using email
    const user = await User.findOne({email: normalizedEmail}).select("+passwordHash");
    if(!user){
        throw new ApiError(401, "Invalid email or password");
    }

    // check password
    const isPasswordValid = await user.comparePassword(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid email or password");
    }

    const accessToken = user.generateAccessToken();
    const { refreshToken } = await createSessionForUser(user._id, req);

    const loggedInuser = await User.findById(user._id)
    .select("-passwordHash");

    return res.status(200)
    .cookie("refreshToken", refreshToken, getRefreshCookieOptions())
    .json(
        new ApiResponse(
            {
                user: loggedInuser,
                accessToken
            },
            "User logged in successfully"
        )
    );

});

const logoutUser = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (incomingRefreshToken) {
        const parsedToken = parseRefreshSessionToken(incomingRefreshToken);

        if (parsedToken) {
            const session = await Session.findById(parsedToken.sessionId);

            if (session && session.user.toString() === req.user._id.toString()) {
                session.revokedAt = new Date();
                await session.save({ validateBeforeSave: false });
            }
        }
    }

    return res.status(200)
    .clearCookie("refreshToken", getRefreshCookieOptions())
    .json(
        new ApiResponse(
            {},
            "User logged out successfully"
        )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            req.user,
            "Current user fetched successfully"
        )
    );
});

const listUserSessions = asyncHandler(async (req, res) => {
    const currentSessionId = getCurrentSessionId(req);
    const now = new Date();

    const sessions = await Session.find({
        user: req.user._id,
        revokedAt: null,
        expiresAt: { $gt: now },
    })
        .select("userAgent ipAddress lastUsedAt createdAt expiresAt revokedAt")
        .sort({ lastUsedAt: -1, createdAt: -1 });

    const serializedSessions = sessions
        .map((session) => serializeSession(session, currentSessionId))
        .sort((a, b) => {
            if (a.isCurrent && !b.isCurrent) {
                return -1;
            }

            if (!a.isCurrent && b.isCurrent) {
                return 1;
            }

            return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
        });

    return res.status(200).json(
        new ApiResponse(
            serializedSessions,
            "Sessions fetched successfully"
        )
    );
});

const revokeSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        throw new ApiError(400, "Invalid session id");
    }

    const session = await Session.findOne({
        _id: sessionId,
        user: req.user._id,
    });

    if (!session) {
        throw new ApiError(404, "Session not found");
    }

    if (!session.revokedAt) {
        session.revokedAt = new Date();
        await session.save({ validateBeforeSave: false });
    }

    const currentSessionId = getCurrentSessionId(req);
    const isCurrentSession = currentSessionId === session._id.toString();

    const response = res.status(200);

    if (isCurrentSession) {
        response.clearCookie("refreshToken", getRefreshCookieOptions());
    }

    return response.json(
        new ApiResponse(
            {
                revokedSessionId: session._id.toString(),
                currentSessionRevoked: isCurrentSession,
            },
            "Session signed out successfully"
        )
    );
});

const revokeOtherSessions = asyncHandler(async (req, res) => {
    const currentSessionId = getCurrentSessionId(req);
    const now = new Date();

    const filter = {
        user: req.user._id,
        revokedAt: null,
        expiresAt: { $gt: now },
    };

    if (currentSessionId && mongoose.Types.ObjectId.isValid(currentSessionId)) {
        filter._id = { $ne: currentSessionId };
    }

    const result = await Session.updateMany(
        filter,
        {
            $set: {
                revokedAt: now,
            },
        }
    );

    return res.status(200).json(
        new ApiResponse(
            {
                revokedCount: result.modifiedCount ?? 0,
            },
            "Other sessions signed out successfully"
        )
    );
});


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    const parsedToken = parseRefreshSessionToken(incomingRefreshToken);

    if (!parsedToken) {
        throw new ApiError(401, "Invalid refresh token");
    }

    const { sessionId, secret } = parsedToken;

    const session = await Session.findById(sessionId).select("+tokenHash");

    if (!session) {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (session.revokedAt) {
        throw new ApiError(401, "Refresh session has been revoked");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
        throw new ApiError(401, "Refresh session has expired");
    }

    if (hashSessionSecret(secret) !== session.tokenHash) {
        throw new ApiError(401, "Invalid refresh token");
    }

    const user = await User.findById(session.user);

    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    session.lastUsedAt = new Date();
    const { userAgent, ipAddress } = getRequestMetadata(req);
    session.userAgent = userAgent;
    session.ipAddress = ipAddress;
    await session.save({ validateBeforeSave: false });

    const accessToken = user.generateAccessToken();

    return res.status(200).json(
        new ApiResponse(
            {
                accessToken,
            },
            "Access token refreshed"
        )
    );
});

const changePassword = asyncHandler( async(req, res) => {
    const { oldPassword, newPassword } = req.body;
    
    if (
        typeof oldPassword !== "string" ||
        typeof newPassword !== "string" ||
        oldPassword === "" ||
        newPassword === ""
    ) {
        throw new ApiError(400, "All fields are required");
    }

    if (/\s/.test(newPassword)) {
        throw new ApiError(400, "Password cannot contain spaces");
    }

    const user = await User.findById(req.user?._id).select("+passwordHash");

    const isPasswordValid = await user.comparePassword(oldPassword);

    if(!isPasswordValid){
        throw new ApiError(400, "Invalid old password")
    }

    user.passwordHash = newPassword;
    await user.save({ validateBeforeSave: false });

    await Session.updateMany(
        { user: user._id, revokedAt: null },
        {
            $set: {
                revokedAt: new Date(),
            },
        }
    );

    return res.status(200)
    .clearCookie("refreshToken", getRefreshCookieOptions())
    .json(
        new ApiResponse(
            {},
            "Password changed successfully. Please log in again."
        )
    );
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    listUserSessions,
    revokeSession,
    revokeOtherSessions,
    startGoogleAuth,
    handleGoogleCallback,
    getCurrentUser,
};
