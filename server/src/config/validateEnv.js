const requiredEnvVars = [
    "PORT",
    "NODE_ENV",
    "MONGODB_URI",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
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

};

