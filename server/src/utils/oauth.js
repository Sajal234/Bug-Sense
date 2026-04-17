import crypto from "crypto";

const resolveCookieSecure = () => {
    if (process.env.COOKIE_SECURE !== undefined) {
        return process.env.COOKIE_SECURE.trim().toLowerCase() === "true";
    }

    return process.env.NODE_ENV === "production";
};

export const createOAuthState = () => {
    return crypto.randomBytes(24).toString("hex");
};

export const getOAuthStateCookieOptions = () => {
    return {
        httpOnly: true,
        secure: resolveCookieSecure(),
        sameSite: "lax",
        maxAge: 10 * 60 * 1000,
    };
};

export const buildGoogleAuthUrl = (state) => {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: "openid email profile",
        state,
        access_type: "offline",
        prompt: "consent",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const exchangeGoogleCode = async (code) => {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: "authorization_code",
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Google token exchange failed");
    }

    return data;
};

export const fetchGoogleProfile = async (accessToken) => {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error("Unable to fetch Google profile");
    }

    return data;
};
