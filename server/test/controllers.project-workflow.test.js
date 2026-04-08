import test from "node:test";
import assert from "node:assert/strict";

import {
    joinProject,
    addMember,
    changeMemberRole,
    transferProjectLead
} from "../src/controllers/project.controller.js";
import { Project } from "../src/models/Project.js";
import { User } from "../src/models/User.js";
import { invokeHandler } from "../test-utils/controller.js";

const validProjectId = "507f1f77bcf86cd799439011";
const validLeadId = "507f1f77bcf86cd799439012";
const validMemberId = "507f1f77bcf86cd799439013";
const validNewLeadId = "507f1f77bcf86cd799439014";

test("joinProject normalizes invite code and role before saving membership", async () => {
    const originalFindOne = Project.findOne;
    const originalFindOneAndUpdate = Project.findOneAndUpdate;

    const project = {
        inviteCode: "ABCD1234",
        members: [{ user: validMemberId, role: "BACKEND" }],
        isMember: () => false
    };

    let receivedFilter;
    let receivedUpdate;
    let receivedOptions;

    try {
        Project.findOneAndUpdate = async (filter, update, options) => {
            receivedFilter = filter;
            receivedUpdate = update;
            receivedOptions = options;
            return project;
        };

        const { res, nextError } = await invokeHandler(joinProject, {
            user: { _id: validMemberId },
            body: {
                inviteCode: " abcd1234 ",
                role: " backend "
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(receivedFilter, {
            inviteCode: "ABCD1234",
            isActive: true,
            "members.user": { $ne: validMemberId }
        });
        assert.deepEqual(receivedUpdate, {
            $push: {
                members: {
                    user: validMemberId,
                    role: "BACKEND"
                }
            }
        });
        assert.deepEqual(receivedOptions, {
            new: true,
            runValidators: true
        });
        assert.equal(res.body?.message, "Project joined successfully");
    } finally {
        Project.findOne = originalFindOne;
        Project.findOneAndUpdate = originalFindOneAndUpdate;
    }
});

test("joinProject rejects users who are already members", async () => {
    const originalFindOne = Project.findOne;
    const originalFindOneAndUpdate = Project.findOneAndUpdate;

    try {
        Project.findOneAndUpdate = async () => null;
        Project.findOne = async () => ({
            isActive: true,
            isMember: () => true
        });

        const { nextError } = await invokeHandler(joinProject, {
            user: { _id: validMemberId },
            body: {
                inviteCode: "ABCD1234"
            }
        });

        assert.equal(nextError?.statusCode, 409);
        assert.equal(nextError?.message, "You are already a member of this project");
    } finally {
        Project.findOne = originalFindOne;
        Project.findOneAndUpdate = originalFindOneAndUpdate;
    }
});

test("addMember adds a normalized role for a valid user", async () => {
    const originalProjectFindById = Project.findById;
    const originalFindOneAndUpdate = Project.findOneAndUpdate;
    const originalUserFindById = User.findById;

    const project = {
        _id: validProjectId,
        lead: { toString: () => validLeadId },
        members: [{ user: validMemberId, role: "FRONTEND" }]
    };

    let receivedFilter;
    let receivedUpdate;
    let receivedOptions;

    try {
        Project.findOneAndUpdate = async (filter, update, options) => {
            receivedFilter = filter;
            receivedUpdate = update;
            receivedOptions = options;
            return project;
        };
        User.findById = async () => ({ _id: validMemberId, name: "Member" });

        const { res, nextError } = await invokeHandler(addMember, {
            params: { projectId: validProjectId },
            user: { _id: validLeadId },
            body: {
                userId: validMemberId,
                role: " frontend "
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(receivedFilter, {
            _id: validProjectId,
            lead: validLeadId,
            "members.user": { $ne: validMemberId }
        });
        assert.deepEqual(receivedUpdate, {
            $push: {
                members: {
                    user: validMemberId,
                    role: "FRONTEND"
                }
            }
        });
        assert.deepEqual(receivedOptions, {
            new: true,
            runValidators: true
        });
        assert.equal(res.body?.message, "Member added successfully");
    } finally {
        Project.findById = originalProjectFindById;
        Project.findOneAndUpdate = originalFindOneAndUpdate;
        User.findById = originalUserFindById;
    }
});

test("changeMemberRole updates an existing member role using normalized input", async () => {
    const originalProjectFindById = Project.findById;

    const member = {
        user: { toString: () => validMemberId },
        role: "FRONTEND"
    };

    const project = {
        _id: validProjectId,
        lead: { toString: () => validLeadId },
        members: [member],
        isLead: (userId) => userId === validLeadId,
        async save() {
            return this;
        }
    };

    try {
        Project.findById = async () => project;

        const { res, nextError } = await invokeHandler(changeMemberRole, {
            params: {
                projectId: validProjectId,
                userId: validMemberId
            },
            user: { _id: validLeadId },
            body: {
                role: " backend "
            }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(member.role, "BACKEND");
        assert.equal(res.body?.message, "Member role updated successfully");
    } finally {
        Project.findById = originalProjectFindById;
    }
});

test("transferProjectLead updates the lead when the new lead is already a member", async () => {
    const originalProjectFindById = Project.findById;

    const project = {
        _id: validProjectId,
        lead: { toString: () => validLeadId },
        isLead: (userId) => userId === validLeadId,
        isMember: (userId) => userId === validNewLeadId,
        async save() {
            return this;
        }
    };

    try {
        Project.findById = async () => project;

        const { res, nextError } = await invokeHandler(transferProjectLead, {
            params: { projectId: validProjectId },
            user: { _id: validLeadId },
            body: { newLeadId: validNewLeadId }
        });

        assert.equal(nextError, undefined);
        assert.equal(res.statusCode, 200);
        assert.equal(project.lead, validNewLeadId);
        assert.equal(res.body?.message, "Project leadership transferred successfully");
    } finally {
        Project.findById = originalProjectFindById;
    }
});
