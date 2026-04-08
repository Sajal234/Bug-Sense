import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
    submitFix,
    requestSeverityReview,
    approveSeverityReview,
    rejectSeverityReview
} from "../src/controllers/bug.controller.js";
import { Project } from "../src/models/Project.js";
import { Bug } from "../src/models/Bug.js";
import { BugFix } from "../src/models/BugFix.js";
import { BUG_ACTIONS, BUG_SEVERITY, BUG_STATUS } from "../src/types/index.js";
import { invokeHandler } from "../test-utils/controller.js";

const validProjectId = "507f1f77bcf86cd799439011";
const validBugId = "507f1f77bcf86cd799439012";
const validUserId = "507f1f77bcf86cd799439013";

const createSession = () => {
    const calls = [];

    return {
        session: {
            startTransaction() {
                calls.push("start");
            },
            async commitTransaction() {
                calls.push("commit");
            },
            async abortTransaction() {
                calls.push("abort");
            },
            endSession() {
                calls.push("end");
            }
        },
        calls
    };
};

test("submitFix creates a pending fix and moves the bug to awaiting verification", async () => {
    const originalProjectFindById = Project.findById;
    const originalBugFindOne = Bug.findOne;
    const originalBugFixFindOne = BugFix.findOne;
    const originalBugFixCreate = BugFix.create;
    const originalStartSession = mongoose.startSession;

    const project = {
        _id: validProjectId,
        isMember: () => true
    };

    const bug = {
        _id: validBugId,
        status: BUG_STATUS.ASSIGNED,
        assignedTo: { toString: () => validUserId },
        fixes: [],
        history: [],
        async save() {
            return this;
        }
    };

    const sessionState = createSession();
    const createdFixes = [];

    try {
        Project.findById = async () => project;
        Bug.findOne = async () => bug;
        BugFix.findOne = async () => null;
        BugFix.create = async (docs) => {
            createdFixes.push(docs[0]);
            return [{ _id: "fix-1" }];
        };
        mongoose.startSession = async () => sessionState.session;

        const { res, nextError } = await invokeHandler(submitFix, {
            params: { projectId: validProjectId, bugId: validBugId },
            user: { _id: validUserId },
            body: {
                commitUrl: " https://github.com/acme/repo/commit/123 ",
                summary: " Fixed the production issue ",
                proof: " screenshot link "
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 201);
        assert.equal(createdFixes.length, 1);
        assert.deepEqual(createdFixes[0], {
            bug: validBugId,
            project: validProjectId,
            submittedBy: validUserId,
            commitUrl: "https://github.com/acme/repo/commit/123",
            summary: "Fixed the production issue",
            status: "PENDING",
            proof: "screenshot link"
        });
        assert.equal(bug.status, BUG_STATUS.AWAITING_VERIFICATION);
        assert.deepEqual(bug.fixes, ["fix-1"]);
        assert.equal(bug.history.at(-1)?.action, BUG_ACTIONS.FIX_SUBMITTED);
        assert.deepEqual(sessionState.calls, ["start", "commit", "end"]);
    } finally {
        Project.findById = originalProjectFindById;
        Bug.findOne = originalBugFindOne;
        BugFix.findOne = originalBugFixFindOne;
        BugFix.create = originalBugFixCreate;
        mongoose.startSession = originalStartSession;
    }
});

test("submitFix converts duplicate-key races into a clean 409 conflict", async () => {
    const originalProjectFindById = Project.findById;
    const originalBugFindOne = Bug.findOne;
    const originalBugFixFindOne = BugFix.findOne;
    const originalBugFixCreate = BugFix.create;
    const originalStartSession = mongoose.startSession;

    const project = {
        _id: validProjectId,
        isMember: () => true
    };

    const bug = {
        _id: validBugId,
        status: BUG_STATUS.ASSIGNED,
        assignedTo: { toString: () => validUserId },
        fixes: [],
        history: [],
        async save() {
            return this;
        }
    };

    const sessionState = createSession();

    try {
        Project.findById = async () => project;
        Bug.findOne = async () => bug;
        BugFix.findOne = async () => null;
        BugFix.create = async () => {
            const err = new Error("duplicate");
            err.code = 11000;
            throw err;
        };
        mongoose.startSession = async () => sessionState.session;

        const { nextError } = await invokeHandler(submitFix, {
            params: { projectId: validProjectId, bugId: validBugId },
            user: { _id: validUserId },
            body: {
                commitUrl: "https://github.com/acme/repo/commit/123",
                summary: "Fixed the production issue"
            }
        });

        assert.equal(nextError?.statusCode, 409);
        assert.equal(nextError?.message, "A fix is already pending");
        assert.deepEqual(sessionState.calls, ["start", "abort", "end"]);
    } finally {
        Project.findById = originalProjectFindById;
        Bug.findOne = originalBugFindOne;
        BugFix.findOne = originalBugFixFindOne;
        BugFix.create = originalBugFixCreate;
        mongoose.startSession = originalStartSession;
    }
});

test("requestSeverityReview atomically creates a pending review request", async () => {
    const originalProjectFindById = Project.findById;
    const originalBugFindOne = Bug.findOne;
    const originalBugFindOneAndUpdate = Bug.findOneAndUpdate;

    const project = {
        _id: validProjectId,
        isMember: () => true
    };

    const bug = {
        _id: validBugId,
        status: BUG_STATUS.OPEN,
        severity: BUG_SEVERITY.LOW
    };

    const updateCalls = [];
    const updatedBug = {
        _id: validBugId,
        status: BUG_STATUS.REVIEW_REQUESTED
    };

    try {
        Project.findById = async () => project;
        Bug.findOne = async () => bug;
        Bug.findOneAndUpdate = async (...args) => {
            updateCalls.push(args);
            return updatedBug;
        };

        const { res, nextError } = await invokeHandler(requestSeverityReview, {
            params: { projectId: validProjectId, bugId: validBugId },
            user: { _id: validUserId },
            body: {
                reason: " Please re-check the severity ",
                proposedSeverity: " high "
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body?.data, updatedBug);
        assert.equal(updateCalls.length, 1);

        const [filter, update, options] = updateCalls[0];
        assert.deepEqual(filter, {
            _id: validBugId,
            project: validProjectId,
            status: BUG_STATUS.OPEN,
            "reviewRequests.status": { $ne: "PENDING" }
        });
        assert.equal(update.$set.status, BUG_STATUS.REVIEW_REQUESTED);
        assert.equal(update.$push.reviewRequests.proposedSeverity, BUG_SEVERITY.HIGH);
        assert.equal(update.$push.reviewRequests.reason, "Please re-check the severity");
        assert.equal(update.$push.history.action, BUG_ACTIONS.SEVERITY_REVIEW_REQUESTED);
        assert.equal(options.new, true);
    } finally {
        Project.findById = originalProjectFindById;
        Bug.findOne = originalBugFindOne;
        Bug.findOneAndUpdate = originalBugFindOneAndUpdate;
    }
});

test("approveSeverityReview updates severity and restores OPEN when no assignee remains", async () => {
    const originalProjectFindById = Project.findById;
    const originalBugFindOne = Bug.findOne;
    const originalStartSession = mongoose.startSession;

    const project = {
        _id: validProjectId,
        isLead: () => true
    };

    const bug = {
        _id: validBugId,
        status: BUG_STATUS.REVIEW_REQUESTED,
        severity: BUG_SEVERITY.LOW,
        assignedTo: null,
        reviewRequests: [
            {
                status: "PENDING",
                previousStatus: BUG_STATUS.ASSIGNED
            }
        ],
        history: [],
        async save() {
            return this;
        }
    };

    const sessionState = createSession();

    try {
        Project.findById = async () => project;
        Bug.findOne = async () => bug;
        mongoose.startSession = async () => sessionState.session;

        const { res, nextError } = await invokeHandler(approveSeverityReview, {
            params: { projectId: validProjectId, bugId: validBugId },
            user: { _id: validUserId },
            body: { newSeverity: " high " }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(bug.severity, BUG_SEVERITY.HIGH);
        assert.equal(bug.status, BUG_STATUS.OPEN);
        assert.equal(bug.reviewRequests[0].status, "APPROVED");
        assert.equal(bug.history[0].action, BUG_ACTIONS.SEVERITY_UPDATED);
        assert.equal(bug.history[0].to, BUG_SEVERITY.HIGH);
        assert.equal(bug.history[1].action, BUG_ACTIONS.SEVERITY_REVIEW_APPROVED);
        assert.equal(bug.history[1].to, BUG_STATUS.OPEN);
        assert.deepEqual(sessionState.calls, ["start", "commit", "end"]);
    } finally {
        Project.findById = originalProjectFindById;
        Bug.findOne = originalBugFindOne;
        mongoose.startSession = originalStartSession;
    }
});

test("rejectSeverityReview marks the review rejected and restores bug status", async () => {
    const originalProjectFindById = Project.findById;
    const originalBugFindOne = Bug.findOne;
    const originalStartSession = mongoose.startSession;

    const project = {
        _id: validProjectId,
        isLead: () => true
    };

    const bug = {
        _id: validBugId,
        status: BUG_STATUS.REVIEW_REQUESTED,
        severity: BUG_SEVERITY.HIGH,
        assignedTo: null,
        reviewRequests: [
            {
                status: "PENDING",
                previousStatus: BUG_STATUS.ASSIGNED
            }
        ],
        history: [],
        async save() {
            return this;
        }
    };

    const sessionState = createSession();

    try {
        Project.findById = async () => project;
        Bug.findOne = async () => bug;
        mongoose.startSession = async () => sessionState.session;

        const { res, nextError } = await invokeHandler(rejectSeverityReview, {
            params: { projectId: validProjectId, bugId: validBugId },
            user: { _id: validUserId },
            body: { reason: " Not severe enough " }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(bug.status, BUG_STATUS.OPEN);
        assert.equal(bug.reviewRequests[0].status, "REJECTED");
        assert.equal(bug.history.at(-1)?.action, BUG_ACTIONS.SEVERITY_REVIEW_REJECTED);
        assert.equal(bug.history.at(-1)?.to, BUG_STATUS.OPEN);
        assert.equal(bug.history.at(-1)?.meta, "Not severe enough");
        assert.deepEqual(sessionState.calls, ["start", "commit", "end"]);
    } finally {
        Project.findById = originalProjectFindById;
        Bug.findOne = originalBugFindOne;
        mongoose.startSession = originalStartSession;
    }
});
