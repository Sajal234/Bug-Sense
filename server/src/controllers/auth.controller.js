
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


const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
};

const getRequestMetadata = (req) => {
    return {
        userAgent: req.get("user-agent") || "",
        ipAddress: req.ip || req.socket?.remoteAddress || "",
    };
};

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
        "-passwordHash -refreshToken"
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
    .select("-passwordHash -refreshToken");

    return res.status(200)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
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

const logoutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {
                refreshToken: undefined
            },
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly : true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
    return res.status(200)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            {},
            "User logged out successfully"
        )
    );
})

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
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });

    const options = {
        httpOnly : true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    };

    return res.status(200)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
        {},
        "Password changed successfully. Please log in again."
    )
);
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword };