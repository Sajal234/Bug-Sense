import test from "node:test";
import assert from "node:assert/strict";

import { validateEnv } from "../src/config/validateEnv.js";

const baseEnv = {
    PORT: "8000",
    NODE_ENV: "development",
    MONGODB_URI: "mongodb://localhost:27017/bug-sense",
    ACCESS_TOKEN_SECRET: "access-secret",
    ACCESS_TOKEN_EXPIRY: "15m",
    REFRESH_TOKEN_EXPIRY: "7d",
    CORS_ORIGIN: "http://localhost:5173"
};

test("validateEnv accepts a valid environment config", () => {
    const originalEnv = process.env;

    try {
        process.env = { ...originalEnv, ...baseEnv, SALT_ROUNDS: "10" };
        assert.doesNotThrow(() => validateEnv());
    } finally {
        process.env = originalEnv;
    }
});

test("validateEnv rejects missing required vars", () => {
    const originalEnv = process.env;
    const nextEnv = { ...originalEnv, ...baseEnv };
    delete nextEnv.PORT;

    try {
        process.env = nextEnv;
        assert.throws(
            () => validateEnv(),
            /Missing required environment variable: PORT/
        );
    } finally {
        process.env = originalEnv;
    }
});

test("validateEnv rejects invalid NODE_ENV", () => {
    const originalEnv = process.env;

    try {
        process.env = { ...originalEnv, ...baseEnv, NODE_ENV: "staging" };
        assert.throws(
            () => validateEnv(),
            /NODE_ENV must be one of: development, production, test/
        );
    } finally {
        process.env = originalEnv;
    }
});

test("validateEnv rejects invalid PORT", () => {
    const originalEnv = process.env;

    try {
        process.env = { ...originalEnv, ...baseEnv, PORT: "abc" };
        assert.throws(
            () => validateEnv(),
            /PORT must be a positive number/
        );
    } finally {
        process.env = originalEnv;
    }
});

test("validateEnv rejects invalid SALT_ROUNDS when provided", () => {
    const originalEnv = process.env;

    try {
        process.env = { ...originalEnv, ...baseEnv, SALT_ROUNDS: "2" };
        assert.throws(
            () => validateEnv(),
            /SALT_ROUNDS must be a number >= 4/
        );
    } finally {
        process.env = originalEnv;
    }
});
