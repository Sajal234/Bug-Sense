const requiredEnvVars = [
    "PORT",
    "NODE_ENV",
    "MONGODB_URI",
    "ACCESS_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRY",
    "REFRESH_TOKEN_EXPIRY",
    "CORS_ORIGIN"
];

export const validateEnv = () => {
    requiredEnvVars.forEach((key) => {
        if (!process.env[key]) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
    });

    const validNodeEnvs = ["development", "production", "test"];

    if (!validNodeEnvs.includes(process.env.NODE_ENV)) {
        throw new Error("NODE_ENV must be one of: development, production, test");
    }

    if (Number.isNaN(Number(process.env.PORT)) || Number(process.env.PORT) <= 0) {
        throw new Error("PORT must be a positive number");
    }

    if (
        process.env.SALT_ROUNDS !== undefined &&
        (
            Number.isNaN(Number(process.env.SALT_ROUNDS)) ||
            Number(process.env.SALT_ROUNDS) < 4
        )
    ){
        throw new Error("SALT_ROUNDS must be a number >= 4");
    }

    if (process.env.COOKIE_SAME_SITE !== undefined) {
        const normalizedSameSite = process.env.COOKIE_SAME_SITE.trim().toLowerCase();

        if (!["lax", "strict", "none"].includes(normalizedSameSite)) {
            throw new Error("COOKIE_SAME_SITE must be one of: lax, strict, none");
        }
    }

    if (process.env.COOKIE_SECURE !== undefined) {
        const normalizedCookieSecure = process.env.COOKIE_SECURE.trim().toLowerCase();

        if (!["true", "false"].includes(normalizedCookieSecure)) {
            throw new Error("COOKIE_SECURE must be either true or false");
        }
    }

    const resolvedCookieSecure =
        process.env.COOKIE_SECURE !== undefined
            ? process.env.COOKIE_SECURE.trim().toLowerCase() === "true"
            : process.env.NODE_ENV === "production";

    const resolvedSameSite =
        process.env.COOKIE_SAME_SITE?.trim().toLowerCase() ||
        (resolvedCookieSecure ? "none" : "lax");

    if (resolvedSameSite === "none" && !resolvedCookieSecure) {
        throw new Error("COOKIE_SECURE must be true when COOKIE_SAME_SITE is none");
    }

    const allowedOrigins = process.env.CORS_ORIGIN
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (allowedOrigins.length === 0) {
        throw new Error("CORS_ORIGIN must include at least one origin");
    }

};
