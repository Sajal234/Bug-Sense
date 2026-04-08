import test from "node:test";
import assert from "node:assert/strict";

import {
    registerUser,
    loginUser,
    changePassword
} from "../src/controllers/auth.controller.js";
import {
    createProject,
    joinProject,
    changeMemberRole
} from "../src/controllers/project.controller.js";
import {
    createBug,
    submitFix,
    requestSeverityReview
} from "../src/controllers/bug.controller.js";
import {
    addComment,
    editComment
} from "../src/controllers/comment.controller.js";
import { invokeHandler } from "../test-utils/controller.js";

const validObjectId = "507f1f77bcf86cd799439011";

test("registerUser rejects non-string email payloads", async () => {
    const { nextError } = await invokeHandler(registerUser, {
        body: { name: "Sajal", email: {}, password: "secret123" }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "All fields are required");
});

test("loginUser rejects non-string password payloads", async () => {
    const { nextError } = await invokeHandler(loginUser, {
        body: { email: "user@example.com", password: 123456 }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "Email and password are required");
});

test("changePassword rejects passwords with spaces", async () => {
    const { nextError } = await invokeHandler(changePassword, {
        body: { oldPassword: "oldPass123", newPassword: "new pass 123" }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "Password cannot contain spaces");
});

test("createProject rejects non-string project names", async () => {
    const { nextError } = await invokeHandler(createProject, {
        body: { name: { bad: true }, description: "Test project" }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "Project name is required");
});

test("joinProject rejects non-string invite codes", async () => {
    const { nextError } = await invokeHandler(joinProject, {
        body: { inviteCode: 12345 }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "Invite code is required");
});

test("changeMemberRole rejects non-string role values", async () => {
    const { nextError } = await invokeHandler(changeMemberRole, {
        params: { projectId: validObjectId, userId: validObjectId },
        body: { role: { name: "backend" } }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "Role is required");
});

test("createBug rejects invalid field types before database work", async () => {
    const { nextError } = await invokeHandler(createBug, {
        params: { projectId: validObjectId },
        body: {
            title: 404,
            description: "This is a valid length description",
            bugType: "API",
            environment: "PRODUCTION"
        }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "All required fields must be provided");
});

test("submitFix rejects invalid summary and commitUrl payload types", async () => {
    const { nextError } = await invokeHandler(submitFix, {
        params: { projectId: validObjectId, bugId: validObjectId },
        body: { summary: {}, commitUrl: [] }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "Summary and commitUrl are required");
});

test("requestSeverityReview rejects non-string reasons", async () => {
    const { nextError } = await invokeHandler(requestSeverityReview, {
        params: { projectId: validObjectId, bugId: validObjectId },
        body: { reason: false, proposedSeverity: "HIGH" }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "Review reason is required");
});

test("addComment rejects non-string comment text", async () => {
    const { nextError } = await invokeHandler(addComment, {
        params: { projectId: validObjectId, bugId: validObjectId },
        body: { text: 42 }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "Comment text is required");
});

test("editComment rejects non-string updated comment text", async () => {
    const { nextError } = await invokeHandler(editComment, {
        params: {
            commentId: validObjectId,
            projectId: validObjectId,
            bugId: validObjectId
        },
        body: { text: null }
    });

    assert.equal(nextError?.statusCode, 400);
    assert.equal(nextError?.message, "Updated comment text is required");
});
