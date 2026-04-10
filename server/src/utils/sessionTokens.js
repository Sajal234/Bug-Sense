import crypto from "crypto";
import mongoose from "mongoose";

const REFRESH_TOKEN_EXPIRY_FALLBACK = "7d";

const DURATION_UNITS_IN_MS = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
};

export const hashSessionSecret = (secret) => {
    return crypto.createHash("sha256").update(secret).digest("hex");
};

export const createSessionSecret = () => {
    return crypto.randomBytes(32).toString("base64url");
};

export const buildRefreshSessionToken = (sessionId, secret) => {
    return `${sessionId}.${secret}`;
};

export const parseRefreshSessionToken = (token) => {
    if (typeof token !== "string" || token.trim() === "") {
        return null;
    }

    const trimmedToken = token.trim();
    const separatorIndex = trimmedToken.indexOf(".");

    if (separatorIndex <= 0 || separatorIndex === trimmedToken.length - 1) {
        return null;
    }

    const sessionId = trimmedToken.slice(0, separatorIndex);
    const secret = trimmedToken.slice(separatorIndex + 1);

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return null;
    }

    return { sessionId, secret };
};

const parseDurationMs = (value) => {
    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }

    const trimmedValue = value.trim();

    if (/^\d+$/.test(trimmedValue)) {
        return Number(trimmedValue);
    }

    const match = trimmedValue.match(/^(\d+)([smhdw])$/i);

    if (!match) {
        return null;
    }

    const [, amount, unit] = match;
    const unitMs = DURATION_UNITS_IN_MS[unit.toLowerCase()];

    if (!unitMs) {
        return null;
    }

    return Number(amount) * unitMs;
};

export const getRefreshSessionExpiryDate = (now = new Date()) => {
    const durationMs =
        parseDurationMs(process.env.REFRESH_TOKEN_EXPIRY) ||
        parseDurationMs(REFRESH_TOKEN_EXPIRY_FALLBACK);

    return new Date(now.getTime() + durationMs);
};