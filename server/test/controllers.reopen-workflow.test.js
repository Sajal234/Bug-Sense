import test from "node:test";
import assert from "node:assert/strict";

import {
    requestReopen,
    approveReopen,
    rejectReopen
} from "../src/controllers/bug.controller.js";
import { Project } from "../src/models/Project.js";
import { Bug } from "../src/models/Bug.js";
import { BUG_ACTIONS, BUG_STATUS } from "../src/types/index.js";
import { invokeHandler } from "../test-utils/controller.js";

const validProjectId = "507f1f77bcf86cd799439011";
const validBugId = "507f1f77bcf86cd799439012";
const validUserId = "507f1f77bcf86cd799439013";
const validLeadId = "507f1f77bcf86cd799439014";

test("requestReopen moves a resolved bug back to pending review", async () => {
    const originalProjectFindById = Project.findById;
    const originalBugFindOne = Bug.findOne;

    const project = {
        _id: validProjectId,
        isMember: () => true
    };

    const bug = {
        _id: validBugId,
        status: BUG_STATUS.RESOLVED,
        history: [],
        async save() {
            return this;
        }
    };

    try {
        Project.findById = async () => project;
        Bug.findOne = async () => bug;

        const { res, nextError } = await invokeHandler(requestReopen, {
            params: { projectId: validProjectId, bugId: validBugId },
            user: { _id: validUserId },
            body: { reason: " Still reproducible in production " }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(bug.status, BUG_STATUS.PENDING_REVIEW);
        assert.equal(bug.history.at(-1)?.action, BUG_ACTIONS.REOPEN_REQUESTED);
        assert.equal(bug.history.at(-1)?.to, BUG_STATUS.PENDING_REVIEW);
        assert.equal(bug.history.at(-1)?.meta, "Still reproducible in production");
        assert.equal(res.body?.message, "Reopen request submitted for review");
    } finally {
        Project.findById = originalProjectFindById;
        Bug.findOne = originalBugFindOne;
    }
});

test("requestReopen rejects bugs that are not resolved", async () => {
    const originalProjectFindById = Project.findById;
    const originalBugFindOne = Bug.findOne;

    try {
        Project.findById = async () => ({
            _id: validProjectId,
            isMember: () => true
        });
        Bug.findOne = async () => ({
            _id: validBugId,
            status: BUG_STATUS.OPEN
        });

        const { nextError } = await invokeHandler(requestReopen, {
            params: { projectId: validProjectId, bugId: validBugId },
            user: { _id: validUserId },
            body: { reason: "Still happening" }
        });

        assert.equal(nextError?.statusCode, 400);
        assert.equal(nextError?.message, "Only resolved bugs can be reopened");
    } finally {
        Project.findById = originalProjectFindById;
        Bug.findOne = originalBugFindOne;
    }
});

test("approveReopen moves the bug to reopened and clears assignment", async () => {
    const originalProjectFindById = Project.findById;
    const originalBugFindOne = Bug.findOne;

    const project = {
        _id: validProjectId,
        isLead: (userId) => userId === validLeadId
    };

    const bug = {
        _id: validBugId,
        status: BUG_STATUS.PENDING_REVIEW,
        assignedTo: { toString: () => validUserId },
        history: [
            {
                action: BUG_ACTIONS.REOPEN_REQUESTED
            }
        ],
        async save() {
            return this;
        }
    };

    try {
        Project.findById = async () => project;
        Bug.findOne = async () => bug;

        const { res, nextError } = await invokeHandler(approveReopen, {
            params: { projectId: validProjectId, bugId: validBugId },
            user: { _id: validLeadId }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(bug.status, BUG_STATUS.REOPENED);
        assert.equal(bug.assignedTo, null);
        assert.equal(bug.history.at(-1)?.action, BUG_ACTIONS.REOPEN_APPROVED);
        assert.equal(bug.history.at(-1)?.to, BUG_STATUS.REOPENED);
        assert.equal(res.body?.message, "Reopen request approved successfully");
    } finally {
        Project.findById = originalProjectFindById;
        Bug.findOne = originalBugFindOne;
    }
});

test("rejectReopen restores the bug back to resolved", async () => {
    const originalProjectFindById = Project.findById;
    const originalBugFindOne = Bug.findOne;

    const project = {
        _id: validProjectId,
        isLead: (userId) => userId === validLeadId
    };

    const bug = {
        _id: validBugId,
        status: BUG_STATUS.PENDING_REVIEW,
        history: [
            {
                action: BUG_ACTIONS.REOPEN_REQUESTED
            }
        ],
        async save() {
            return this;
        }
    };

    try {
        Project.findById = async () => project;
        Bug.findOne = async () => bug;

        const { res, nextError } = await invokeHandler(rejectReopen, {
            params: { projectId: validProjectId, bugId: validBugId },
            user: { _id: validLeadId },
            body: { reason: " Working as expected " }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(bug.status, BUG_STATUS.RESOLVED);
        assert.equal(bug.history.at(-1)?.action, BUG_ACTIONS.REOPEN_REJECTED);
        assert.equal(bug.history.at(-1)?.to, BUG_STATUS.RESOLVED);
        assert.equal(bug.history.at(-1)?.meta, "Working as expected");
        assert.equal(res.body?.message, "Reopen request rejected successfully");
    } finally {
        Project.findById = originalProjectFindById;
        Bug.findOne = originalBugFindOne;
    }
});
