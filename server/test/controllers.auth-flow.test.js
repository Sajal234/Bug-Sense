import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword
} from "../src/controllers/auth.controller.js";
import { User } from "../src/models/User.js";
import { Session } from "../src/models/Session.js";
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

test("loginUser creates a refresh session cookie and returns the access token", async () => {
    const originalFindOne = User.findOne;
    const originalFindById = User.findById;
    const originalSessionCreate = Session.create;

    let createdSessionPayload;

    const fakeUser = {
        _id: "507f191e810c19729de860ea",
        email: "sajal@example.com",
        comparePassword: async (candidatePassword) => candidatePassword === "secret123",
        generateAccessToken: () => "access-token"
    };

    try {
        User.findOne = () => ({
            select: async () => fakeUser
        });
        User.findById = () => ({
            select: async () => ({
                _id: fakeUser._id,
                name: "Sajal",
                email: "sajal@example.com"
            })
        });
        Session.create = async (payload) => {
            createdSessionPayload = payload;
            return { _id: "507f191e810c19729de860ff" };
        };

        const { res, nextError } = await invokeHandler(loginUser, {
            body: {
                email: " SAJAL@EXAMPLE.COM ",
                password: "secret123"
            },
            get(headerName) {
                return headerName === "user-agent" ? "Chrome Test" : undefined;
            },
            ip: "::1",
            socket: {
                remoteAddress: "::1"
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body?.data?.accessToken, "access-token");
        assert.equal(res.cookies.length, 1);
        assert.equal(res.cookies[0].name, "refreshToken");
        assert.ok(res.cookies[0].value.startsWith("507f191e810c19729de860ff."));
        assert.equal(createdSessionPayload.user, fakeUser._id);
        assert.equal(createdSessionPayload.userAgent, "Chrome Test");
        assert.equal(createdSessionPayload.ipAddress, "::1");
        assert.equal(createdSessionPayload.tokenHash.length, 64);
    } finally {
        User.findOne = originalFindOne;
        User.findById = originalFindById;
        Session.create = originalSessionCreate;
    }
});

test("logoutUser revokes the current session and clears the refresh cookie", async () => {
    const originalFindByIdAndUpdate = Session.findByIdAndUpdate;

    let revokedSessionId;
    let revokedPayload;

    try {
        Session.findByIdAndUpdate = async (sessionId, update) => {
            revokedSessionId = sessionId;
            revokedPayload = update;
            return { _id: sessionId };
        };

        const { res, nextError } = await invokeHandler(logoutUser, {
            cookies: {
                refreshToken: "507f191e810c19729de860ff.sessionsecret"
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(revokedSessionId, "507f191e810c19729de860ff");
        assert.ok(revokedPayload.$set.revokedAt instanceof Date);
        assert.equal(res.clearedCookies.length, 1);
        assert.equal(res.clearedCookies[0].name, "refreshToken");
        assert.equal(res.body?.message, "User logged out successfully");
    } finally {
        Session.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
});

test("refreshAccessToken returns a new access token for a valid session token", async () => {
    const originalSessionFindById = Session.findById;
    const originalUserFindById = User.findById;

    const sessionId = "507f191e810c19729de860ff";
    const secret = "plain-secret";
    const tokenHash = sha256(secret);

    const fakeSession = {
        _id: sessionId,
        user: "507f191e810c19729de860ea",
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        save: async () => fakeSession
    };

    const fakeUser = {
        _id: "507f191e810c19729de860ea",
        generateAccessToken: () => "new-access-token"
    };

    try {
        Session.findById = () => ({
            select: async () => fakeSession
        });
        User.findById = async () => fakeUser;

        const { res, nextError } = await invokeHandler(refreshAccessToken, {
            cookies: {
                refreshToken: `${sessionId}.${secret}`
            },
            get(headerName) {
                return headerName === "user-agent" ? "Chrome Test" : undefined;
            },
            ip: "::1",
            socket: {
                remoteAddress: "::1"
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body?.data?.accessToken, "new-access-token");
        assert.equal(fakeSession.userAgent, "Chrome Test");
        assert.equal(fakeSession.ipAddress, "::1");
        assert.ok(fakeSession.lastUsedAt instanceof Date);
        assert.equal(res.cookies.length, 0);
    } finally {
        Session.findById = originalSessionFindById;
        User.findById = originalUserFindById;
    }
});

test("refreshAccessToken rejects mismatched session secrets", async () => {
    const originalSessionFindById = Session.findById;

    try {
        Session.findById = () => ({
            select: async () => ({
                _id: "507f191e810c19729de860ff",
                user: "507f191e810c19729de860ea",
                tokenHash: sha256("different-secret"),
                revokedAt: null,
                expiresAt: new Date(Date.now() + 60_000)
            })
        });

        const { nextError } = await invokeHandler(refreshAccessToken, {
            cookies: {
                refreshToken: "507f191e810c19729de860ff.incoming-secret"
            }
        });

        assert.equal(nextError?.statusCode, 401);
        assert.equal(nextError?.message, "Invalid refresh token");
    } finally {
        Session.findById = originalSessionFindById;
    }
});

test("changePassword revokes all active sessions and clears the refresh cookie", async () => {
    const originalFindById = User.findById;
    const originalSessionUpdateMany = Session.updateMany;

    const savedStates = [];
    let revokedFilter;
    let revokedPayload;

    const fakeUser = {
        _id: "507f191e810c19729de860ea",
        passwordHash: "old-password",
        comparePassword: async (candidatePassword) => candidatePassword === "oldPass123",
        save: async () => {
            savedStates.push({
                passwordHash: fakeUser.passwordHash
            });
            return fakeUser;
        }
    };

    try {
        User.findById = () => ({
            select: async () => fakeUser
        });
        Session.updateMany = async (filter, update) => {
            revokedFilter = filter;
            revokedPayload = update;
            return { acknowledged: true, modifiedCount: 2 };
        };

        const { res, nextError } = await invokeHandler(changePassword, {
            user: { _id: fakeUser._id },
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
            passwordHash: "newPass123"
        });
        assert.deepEqual(revokedFilter, {
            user: fakeUser._id,
            revokedAt: null
        });
        assert.ok(revokedPayload.$set.revokedAt instanceof Date);
        assert.equal(
            res.body?.message,
            "Password changed successfully. Please log in again."
        );
    } finally {
        User.findById = originalFindById;
        Session.updateMany = originalSessionUpdateMany;
    }
});
