import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword
} from "../src/controllers/auth.controller.js";
import { User } from "../src/models/User.js";
import { invokeHandler } from "../test-utils/controller.js";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

test("registerUser creates a user with normalized name and email", async () => {
    const originalFindOne = User.findOne;
    const originalCreate = User.create;
    const originalFindById = User.findById;

    const createdPayloads = [];
    const createdUser = {
        _id: "user-1",
        name: "Sajal",
        email: "sajal@example.com"
    };

    try {
        User.findOne = async () => null;
        User.create = async (payload) => {
            createdPayloads.push(payload);
            return { _id: "user-1" };
        };
        User.findById = () => ({
            select: async () => createdUser
        });

        const { res, nextError } = await invokeHandler(registerUser, {
            body: {
                name: "  Sajal  ",
                email: "  SAJAL@EXAMPLE.COM ",
                password: "secret123"
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 201);
        assert.equal(createdPayloads.length, 1);
        assert.deepEqual(createdPayloads[0], {
            name: "Sajal",
            email: "sajal@example.com",
            passwordHash: "secret123"
        });
        assert.equal(res.body?.data?.name, "Sajal");
        assert.equal(res.body?.data?.email, "sajal@example.com");
    } finally {
        User.findOne = originalFindOne;
        User.create = originalCreate;
        User.findById = originalFindById;
    }
});

test("loginUser sets a refresh cookie and returns the access token", async () => {
    const originalFindOne = User.findOne;
    const originalFindById = User.findById;

    const savedStates = [];
    const fakeUser = {
        _id: "user-1",
        email: "sajal@example.com",
        refreshToken: undefined,
        comparePassword: async (candidatePassword) => candidatePassword === "secret123",
        generateAccessToken: () => "access-token",
        generateRefreshToken: () => "refresh-token",
        save: async () => {
            savedStates.push(fakeUser.refreshToken);
            return fakeUser;
        }
    };

    try {
        User.findOne = () => ({
            select: async () => fakeUser
        });
        User.findById = () => ({
            select: async () => ({
                _id: "user-1",
                name: "Sajal",
                email: "sajal@example.com"
            })
        });

        const { res, nextError } = await invokeHandler(loginUser, {
            body: {
                email: " SAJAL@EXAMPLE.COM ",
                password: "secret123"
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body?.data?.accessToken, "access-token");
        assert.equal(res.cookies.length, 1);
        assert.equal(res.cookies[0].name, "refreshToken");
        assert.equal(res.cookies[0].value, "refresh-token");
        assert.equal(savedStates.length, 1);
        assert.equal(savedStates[0], sha256("refresh-token"));
    } finally {
        User.findOne = originalFindOne;
        User.findById = originalFindById;
    }
});

test("logoutUser clears the refresh cookie", async () => {
    const originalFindByIdAndUpdate = User.findByIdAndUpdate;

    try {
        User.findByIdAndUpdate = async () => ({ _id: "user-1" });

        const { res, nextError } = await invokeHandler(logoutUser, {
            user: { _id: "user-1" }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(res.clearedCookies.length, 1);
        assert.equal(res.clearedCookies[0].name, "refreshToken");
        assert.equal(res.body?.message, "User logged out successfully");
    } finally {
        User.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
});

test("refreshAccessToken rotates the refresh cookie for a valid token", async () => {
    const originalVerify = jwt.verify;
    const originalFindById = User.findById;

    const incomingRefreshToken = "incoming-refresh-token";
    const savedStates = [];
    const fakeUser = {
        _id: "user-1",
        refreshToken: sha256(incomingRefreshToken),
        generateAccessToken: () => "new-access-token",
        generateRefreshToken: () => "new-refresh-token",
        save: async () => {
            savedStates.push(fakeUser.refreshToken);
            return fakeUser;
        }
    };

    try {
        jwt.verify = () => ({ userId: "user-1" });
        User.findById = () => ({
            select: async () => fakeUser
        });

        const { res, nextError } = await invokeHandler(refreshAccessToken, {
            cookies: {
                refreshToken: incomingRefreshToken
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body?.data?.accessToken, "new-access-token");
        assert.equal(res.cookies.length, 1);
        assert.equal(res.cookies[0].name, "refreshToken");
        assert.equal(res.cookies[0].value, "new-refresh-token");
        assert.equal(savedStates.at(-1), sha256("new-refresh-token"));
    } finally {
        jwt.verify = originalVerify;
        User.findById = originalFindById;
    }
});

test("refreshAccessToken rejects mismatched refresh tokens", async () => {
    const originalVerify = jwt.verify;
    const originalFindById = User.findById;

    try {
        jwt.verify = () => ({ userId: "user-1" });
        User.findById = () => ({
            select: async () => ({
                _id: "user-1",
                refreshToken: sha256("different-token")
            })
        });

        const { nextError } = await invokeHandler(refreshAccessToken, {
            cookies: {
                refreshToken: "incoming-refresh-token"
            }
        });

        assert.equal(nextError?.statusCode, 401);
        assert.equal(nextError?.message, "Refresh token is expired or used");
    } finally {
        jwt.verify = originalVerify;
        User.findById = originalFindById;
    }
});

test("changePassword clears the refresh cookie and stored refresh token", async () => {
    const originalFindById = User.findById;

    const savedStates = [];
    const fakeUser = {
        _id: "user-1",
        passwordHash: "old-password",
        refreshToken: "stored-refresh-token",
        comparePassword: async (candidatePassword) => candidatePassword === "oldPass123",
        save: async () => {
            savedStates.push({
                passwordHash: fakeUser.passwordHash,
                refreshToken: fakeUser.refreshToken
            });
            return fakeUser;
        }
    };

    try {
        User.findById = () => ({
            select: async () => fakeUser
        });

        const { res, nextError } = await invokeHandler(changePassword, {
            user: { _id: "user-1" },
            body: {
                oldPassword: "oldPass123",
                newPassword: "newPass123"
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(res.clearedCookies.length, 1);
        assert.equal(res.clearedCookies[0].name, "refreshToken");
        assert.deepEqual(savedStates.at(-1), {
            passwordHash: "newPass123",
            refreshToken: undefined
        });
        assert.equal(
            res.body?.message,
            "Password changed successfully. Please log in again."
        );
    } finally {
        User.findById = originalFindById;
    }
});
