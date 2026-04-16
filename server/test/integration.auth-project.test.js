import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Project } from "../src/models/Project.js";
import { Bug } from "../src/models/Bug.js";
import { BugFix } from "../src/models/BugFix.js";
import { User } from "../src/models/User.js";

let mongoServer;
let app;
const mongoPort = 43000 + (process.pid % 1000);

const setupEnv = () => {
    process.env.NODE_ENV = "test";
    process.env.CORS_ORIGIN = "http://localhost:5173";
    process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
    process.env.ACCESS_TOKEN_EXPIRY = "15m";
    process.env.REFRESH_TOKEN_EXPIRY = "7d";
};

const uniqueEmail = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

const registerUser = async ({ name, email, password }) => {
    return request(app)
        .post("/api/v1/users/register")
        .send({ name, email, password });
};

const loginUser = async ({ email, password }) => {
    return request(app)
        .post("/api/v1/users/login")
        .send({ email, password });
};

const seedUser = async ({ name, email, password }) => {
    const user = await User.create({
        name,
        email,
        passwordHash: password
    });

    return {
        user,
        token: user.generateAccessToken()
    };
};

const seedProject = async ({ leadId, name, description }) => {
    return Project.create({
        name,
        description,
        lead: leadId,
        members: [{ user: leadId, role: "FULLSTACK" }],
        inviteCode: `TEST${Math.random().toString(16).slice(2, 10).toUpperCase()}`
    });
};

const createProject = async ({ token, name, description }) => {
    return request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${token}`)
        .send({ name, description });
};

const addMemberToProject = async ({ projectId, token, email, role }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/add-member`)
        .set("Authorization", `Bearer ${token}`)
        .send({ email, role });
};

const createBugRequest = async ({ projectId, token, body }) => {
    return request(app)
        .post(`/api/v1/projects/${projectId}/bugs`)
        .set("Authorization", `Bearer ${token}`)
        .send(body);
};

const approveBugRequest = async ({ projectId, bugId, token, severity }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/approve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ severity });
};

const rejectBugRequest = async ({ projectId, bugId, token, reason }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/reject`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason });
};

const assignBugRequest = async ({ projectId, bugId, token, assignedTo }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/assign`)
        .set("Authorization", `Bearer ${token}`)
        .send({ assignedTo });
};

const submitFixRequest = async ({ projectId, bugId, token, body }) => {
    return request(app)
        .post(`/api/v1/projects/${projectId}/bugs/${bugId}/fix`)
        .set("Authorization", `Bearer ${token}`)
        .send(body);
};

const acceptBugFixRequest = async ({ projectId, bugId, fixId, token }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/fixes/${fixId}/accept`)
        .set("Authorization", `Bearer ${token}`);
};

const rejectBugFixRequest = async ({ projectId, bugId, fixId, token, reason }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/fixes/${fixId}/reject`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason });
};

const requestSeverityReview = async ({ projectId, bugId, token, body }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/severity-review`)
        .set("Authorization", `Bearer ${token}`)
        .send(body);
};

const approveSeverityReviewRequest = async ({ projectId, bugId, token, newSeverity }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/severity-review/approve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ newSeverity });
};

const rejectSeverityReviewRequest = async ({ projectId, bugId, token, reason }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/severity-review/reject`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason });
};

const requestReopenRequest = async ({ projectId, bugId, token, reason }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/request-reopen`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason });
};

const approveReopenRequest = async ({ projectId, bugId, token }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/approve-reopen`)
        .set("Authorization", `Bearer ${token}`);
};

const rejectReopenRequest = async ({ projectId, bugId, token, reason }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/reject-reopen`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason });
};

const addCommentRequest = async ({ projectId, bugId, token, text }) => {
    return request(app)
        .post(`/api/v1/projects/${projectId}/bugs/${bugId}/comments`)
        .set("Authorization", `Bearer ${token}`)
        .send({ text });
};

const getCommentsRequest = async ({ projectId, bugId, token }) => {
    return request(app)
        .get(`/api/v1/projects/${projectId}/bugs/${bugId}/comments`)
        .set("Authorization", `Bearer ${token}`);
};

const editCommentRequest = async ({ projectId, bugId, commentId, token, text }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/bugs/${bugId}/comments/${commentId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ text });
};

const deleteCommentRequest = async ({ projectId, bugId, commentId, token }) => {
    return request(app)
        .delete(`/api/v1/projects/${projectId}/bugs/${bugId}/comments/${commentId}`)
        .set("Authorization", `Bearer ${token}`);
};

const getProjectMembersRequest = async ({ projectId, token }) => {
    return request(app)
        .get(`/api/v1/projects/${projectId}/members`)
        .set("Authorization", `Bearer ${token}`);
};

const getProjectStatsRequest = async ({ projectId, token }) => {
    return request(app)
        .get(`/api/v1/projects/${projectId}/stats`)
        .set("Authorization", `Bearer ${token}`);
};

const getDeveloperWorkloadRequest = async ({ projectId, token }) => {
    return request(app)
        .get(`/api/v1/projects/${projectId}/workload`)
        .set("Authorization", `Bearer ${token}`);
};

const getProjectBugsRequest = async ({ projectId, token, query = "" }) => {
    return request(app)
        .get(`/api/v1/projects/${projectId}/bugs${query}`)
        .set("Authorization", `Bearer ${token}`);
};

const getBugInfoRequest = async ({ projectId, bugId, token }) => {
    return request(app)
        .get(`/api/v1/projects/${projectId}/bugs/${bugId}`)
        .set("Authorization", `Bearer ${token}`);
};

const leaveProjectRequest = async ({ projectId, token }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/leave`)
        .set("Authorization", `Bearer ${token}`);
};

const removeMemberRequest = async ({ projectId, token, userId }) => {
    return request(app)
        .patch(`/api/v1/projects/${projectId}/remove-member`)
        .set("Authorization", `Bearer ${token}`)
        .send({ userId });
};

const getMyDashboardRequest = async ({ token }) => {
    return request(app)
        .get("/api/v1/users/me/dashboard")
        .set("Authorization", `Bearer ${token}`);
};

const getUserDashboardRequest = async ({ token, userId }) => {
    return request(app)
        .get(`/api/v1/users/${userId}/dashboard`)
        .set("Authorization", `Bearer ${token}`);
};

const createProjectTeam = async () => {
    const password = "secret123";
    const leadEmail = uniqueEmail("lead");
    const memberEmail = uniqueEmail("member");

    const { user: leadUser, token: leadToken } = await seedUser({
        name: "Lead",
        email: leadEmail,
        password
    });

    const { user: memberUser, token: memberToken } = await seedUser({
        name: "Member",
        email: memberEmail,
        password
    });

    const project = await seedProject({
        leadId: leadUser._id,
        name: "Integration Project",
        description: "Project for bug workflow integration"
    });

    const addMemberResponse = await addMemberToProject({
        projectId: project._id.toString(),
        token: leadToken,
        email: memberEmail,
        role: "BACKEND"
    });

    assert.equal(addMemberResponse.status, 200);

    return {
        projectId: project._id.toString(),
        leadToken,
        memberToken,
        memberId: memberUser._id.toString(),
        leadId: leadUser._id.toString()
    };
};

const createApprovedBug = async ({
    projectId,
    reporterToken,
    leadToken,
    bugBody
}) => {
    const createResponse = await createBugRequest({
        projectId,
        token: reporterToken,
        body: {
            title: "API returns wrong payload",
            description: "Response body shape is wrong in production.",
            bugType: "api",
            environment: "production",
            ...bugBody
        }
    });

    assert.equal(createResponse.status, 201);

    const bugId = createResponse.body.data._id;

    const approveResponse = await approveBugRequest({
        projectId,
        bugId,
        token: leadToken,
        severity: "LOW"
    });

    assert.equal(approveResponse.status, 200);

    return {
        bugId,
        createResponse,
        approveResponse
    };
};

const createAssignedBug = async ({
    projectId,
    reporterToken,
    leadToken,
    assigneeId,
    bugBody
}) => {
    const { bugId } = await createApprovedBug({
        projectId,
        reporterToken,
        leadToken,
        bugBody
    });

    const assignResponse = await assignBugRequest({
        projectId,
        bugId,
        token: leadToken,
        assignedTo: assigneeId
    });

    assert.equal(assignResponse.status, 200);

    return {
        bugId,
        assignResponse
    };
};

const createResolvedBug = async ({
    projectId,
    reporterToken,
    leadToken,
    assigneeId,
    assigneeToken,
    bugBody
}) => {
    const { bugId } = await createAssignedBug({
        projectId,
        reporterToken,
        leadToken,
        assigneeId,
        bugBody
    });

    const submitResponse = await submitFixRequest({
        projectId,
        bugId,
        token: assigneeToken,
        body: {
            summary: "Ship fix for the failing workflow",
            commitUrl: "https://github.com/example/repo/commit/123456",
            proof: "Verified locally"
        }
    });

    assert.equal(submitResponse.status, 201);

    const fixId = submitResponse.body.data.fix._id;

    const acceptResponse = await acceptBugFixRequest({
        projectId,
        bugId,
        fixId,
        token: leadToken
    });

    assert.equal(acceptResponse.status, 200);

    return {
        bugId,
        fixId,
        submitResponse,
        acceptResponse
    };
};

test.before(async () => {
    setupEnv();
    mongoServer = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger"
        },
        instanceOpts: [{
            ip: "127.0.0.1",
            port: mongoPort,
            portGeneration: false,
            args: ["--nounixsocket"]
        }]
    });
    await mongoose.connect(mongoServer.getUri());
    ({ default: app } = await import("../src/app.js"));
});

test.after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test.beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
});

test("register and login work over real HTTP with normalized credentials", async () => {
    const email = uniqueEmail("auth");

    const registerResponse = await registerUser({
        name: "  Sajal  ",
        email: `  ${email.toUpperCase()} `,
        password: "secret123"
    });

    assert.equal(registerResponse.status, 201);
    assert.equal(registerResponse.body.success, true);
    assert.equal(registerResponse.body.data.name, "Sajal");
    assert.equal(registerResponse.body.data.email, email);

    const loginResponse = await loginUser({
        email: ` ${email.toUpperCase()} `,
        password: "secret123"
    });

    assert.equal(loginResponse.status, 200);
    assert.equal(loginResponse.body.success, true);
    assert.equal(typeof loginResponse.body.data.accessToken, "string");
    assert.ok(loginResponse.headers["set-cookie"]?.some((cookie) => cookie.startsWith("refreshToken=")));
    assert.equal(loginResponse.body.data.user.email, email);
});

test("change password clears the refresh session and blocks token refresh", async () => {
    const email = uniqueEmail("password-change");
    const password = "secret123";
    const newPassword = "newSecret123";

    await registerUser({
        name: "Sajal",
        email,
        password
    });

    const agent = request.agent(app);
    const loginResponse = await agent
        .post("/api/v1/users/login")
        .send({ email, password });

    assert.equal(loginResponse.status, 200);

    const accessToken = loginResponse.body.data.accessToken;

    const changePasswordResponse = await agent
        .post("/api/v1/users/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
            oldPassword: password,
            newPassword
        });

    assert.equal(changePasswordResponse.status, 200);
    assert.ok(changePasswordResponse.headers["set-cookie"]?.some((cookie) => cookie.startsWith("refreshToken=;")));

    const refreshResponse = await agent
        .post("/api/v1/users/refresh-token")
        .send();

    assert.equal(refreshResponse.status, 401);
    assert.equal(refreshResponse.body.message, "Unauthorized request");
});

test("authenticated users can create a project and fetch it from my-projects", async () => {
    const email = uniqueEmail("project-owner");
    const password = "secret123";

    await registerUser({
        name: "Lead",
        email,
        password
    });

    const loginResponse = await loginUser({ email, password });
    const accessToken = loginResponse.body.data.accessToken;

    const createProjectResponse = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
            name: "  Bug Sense Backend  ",
            description: "  Internal issue tracker  "
        });

    assert.equal(createProjectResponse.status, 201);
    assert.equal(createProjectResponse.body.success, true);
    assert.equal(createProjectResponse.body.data.name, "Bug Sense Backend");
    assert.equal(createProjectResponse.body.data.description, "Internal issue tracker");
    assert.equal(Array.isArray(createProjectResponse.body.data.members), true);
    assert.equal(createProjectResponse.body.data.members.length, 1);
    assert.equal(createProjectResponse.body.data.members[0].role, "FULLSTACK");

    const myProjectsResponse = await request(app)
        .get("/api/v1/projects/my-projects")
        .set("Authorization", `Bearer ${accessToken}`);

    assert.equal(myProjectsResponse.status, 200);
    assert.equal(myProjectsResponse.body.success, true);
    assert.equal(myProjectsResponse.body.data.length, 1);
    assert.equal(myProjectsResponse.body.data[0].name, "Bug Sense Backend");
});

test("a second user can join a project through invite code with normalized role", async () => {
    const ownerEmail = uniqueEmail("owner");
    const memberEmail = uniqueEmail("member");
    const password = "secret123";

    await registerUser({
        name: "Owner",
        email: ownerEmail,
        password
    });

    await registerUser({
        name: "Member",
        email: memberEmail,
        password
    });

    const ownerLoginResponse = await loginUser({ email: ownerEmail, password });
    const memberLoginResponse = await loginUser({ email: memberEmail, password });

    const ownerToken = ownerLoginResponse.body.data.accessToken;
    const memberToken = memberLoginResponse.body.data.accessToken;

    const createProjectResponse = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
            name: "Integration Project",
            description: "Project for join flow"
        });

    assert.equal(createProjectResponse.status, 201);

    const inviteCode = createProjectResponse.body.data.inviteCode;
    const projectId = createProjectResponse.body.data._id;

    const joinResponse = await request(app)
        .post("/api/v1/projects/join")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({
            inviteCode: ` ${inviteCode.toLowerCase()} `,
            role: " backend "
        });

    assert.equal(joinResponse.status, 200);
    assert.equal(joinResponse.body.success, true);
    assert.equal(joinResponse.body.data.members.length, 2);
    assert.equal(joinResponse.body.data.members.at(-1).role, "BACKEND");

    const membersResponse = await request(app)
        .get(`/api/v1/projects/${projectId}/members`)
        .set("Authorization", `Bearer ${ownerToken}`);

    assert.equal(membersResponse.status, 200);
    assert.equal(membersResponse.body.success, true);
    assert.equal(membersResponse.body.data.members.length, 2);
    assert.equal(membersResponse.body.data.members.at(-1).role, "BACKEND");
});

test("project members can create bugs and leads can approve them with normalized input", async () => {
    const { projectId, leadToken, memberToken } = await createProjectTeam();

    const createResponse = await createBugRequest({
        projectId,
        token: memberToken,
        body: {
            title: "  API payload mismatch  ",
            description: "  Production response body shape is incorrect.  ",
            bugType: " api ",
            environment: " production ",
            moduleName: " payments ",
            stackTrace: "  stack trace  "
        }
    });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.success, true);
    assert.equal(createResponse.body.data.title, "API payload mismatch");
    assert.equal(createResponse.body.data.description, "Production response body shape is incorrect.");
    assert.equal(createResponse.body.data.bugType, "API");
    assert.equal(createResponse.body.data.environment, "PRODUCTION");
    assert.equal(createResponse.body.data.moduleName, "payments");
    assert.equal(createResponse.body.data.stackTrace, "stack trace");
    assert.equal(createResponse.body.data.status, "PENDING_REVIEW");
    assert.equal(createResponse.body.data.severity, "UNCONFIRMED");

    const bugId = createResponse.body.data._id;

    const approveResponse = await approveBugRequest({
        projectId,
        bugId,
        token: leadToken,
        severity: "HIGH"
    });

    assert.equal(approveResponse.status, 200);
    assert.equal(approveResponse.body.success, true);
    assert.equal(approveResponse.body.data.status, "OPEN");
    assert.equal(approveResponse.body.data.severity, "HIGH");
    assert.equal(
        approveResponse.body.data.history.at(-1).action,
        "Bug approved"
    );
});

test("project leads can reject pending bugs with a rejection reason", async () => {
    const { projectId, leadToken, memberToken } = await createProjectTeam();

    const createResponse = await createBugRequest({
        projectId,
        token: memberToken,
        body: {
            title: "Duplicate dashboard issue",
            description: "Reported behavior matches an existing bug.",
            bugType: "UI",
            environment: "STAGING"
        }
    });

    assert.equal(createResponse.status, 201);

    const rejectResponse = await rejectBugRequest({
        projectId,
        bugId: createResponse.body.data._id,
        token: leadToken,
        reason: "Already tracked elsewhere"
    });

    assert.equal(rejectResponse.status, 200);
    assert.equal(rejectResponse.body.success, true);
    assert.equal(rejectResponse.body.data.status, "REJECTED");
    assert.equal(
        rejectResponse.body.data.history.at(-1).meta,
        "Already tracked elsewhere"
    );
});

test("assigned developers can submit fixes and leads can accept them", async () => {
    const { projectId, leadToken, memberToken, memberId } = await createProjectTeam();

    const { bugId } = await createAssignedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        assigneeId: memberId
    });

    const submitResponse = await submitFixRequest({
        projectId,
        bugId,
        token: memberToken,
        body: {
            summary: "  Fix the bad API mapper  ",
            commitUrl: " https://github.com/example/repo/commit/fix-api-mapper ",
            proof: "  Verified with integration test  "
        }
    });

    assert.equal(submitResponse.status, 201);
    assert.equal(submitResponse.body.success, true);
    assert.equal(submitResponse.body.data.bug.status, "AWAITING_VERIFICATION");
    assert.equal(submitResponse.body.data.fix.status, "PENDING");
    assert.equal(submitResponse.body.data.fix.summary, "Fix the bad API mapper");
    assert.equal(
        submitResponse.body.data.fix.commitUrl,
        "https://github.com/example/repo/commit/fix-api-mapper"
    );
    assert.equal(submitResponse.body.data.fix.proof, "Verified with integration test");

    const fixId = submitResponse.body.data.fix._id;

    const acceptResponse = await acceptBugFixRequest({
        projectId,
        bugId,
        fixId,
        token: leadToken
    });

    assert.equal(acceptResponse.status, 200);
    assert.equal(acceptResponse.body.success, true);
    assert.equal(acceptResponse.body.data.bug.status, "RESOLVED");
    assert.equal(acceptResponse.body.data.fix.status, "ACCEPTED");
});

test("project leads can reject pending fixes and return bugs to assigned state", async () => {
    const { projectId, leadToken, memberToken, memberId } = await createProjectTeam();

    const { bugId } = await createAssignedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        assigneeId: memberId
    });

    const submitResponse = await submitFixRequest({
        projectId,
        bugId,
        token: memberToken,
        body: {
            summary: "Retry the broken webhook handler",
            commitUrl: "https://github.com/example/repo/commit/webhook-fix"
        }
    });

    assert.equal(submitResponse.status, 201);

    const rejectResponse = await rejectBugFixRequest({
        projectId,
        bugId,
        fixId: submitResponse.body.data.fix._id,
        token: leadToken,
        reason: "Regression still present"
    });

    assert.equal(rejectResponse.status, 200);
    assert.equal(rejectResponse.body.success, true);
    assert.equal(rejectResponse.body.data.bug.status, "ASSIGNED");
    assert.equal(rejectResponse.body.data.fix.status, "REJECTED");
    assert.equal(rejectResponse.body.data.fix.rejectionReason, "Regression still present");
});

test("severity review requests can be approved or rejected and restore the previous bug state", async () => {
    const { projectId, leadToken, memberToken } = await createProjectTeam();

    const { bugId: approveBugId } = await createApprovedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        bugBody: {
            title: "Important severity review",
            description: "This issue should be treated as more severe.",
            bugType: "BACKEND",
            environment: "PRODUCTION"
        }
    });

    const requestApproveResponse = await requestSeverityReview({
        projectId,
        bugId: approveBugId,
        token: memberToken,
        body: {
            reason: "Customer-facing impact is bigger than expected",
            proposedSeverity: " high "
        }
    });

    assert.equal(requestApproveResponse.status, 200);
    assert.equal(requestApproveResponse.body.data.status, "REVIEW_REQUESTED");

    const approveReviewResponse = await approveSeverityReviewRequest({
        projectId,
        bugId: approveBugId,
        token: leadToken,
        newSeverity: "HIGH"
    });

    assert.equal(approveReviewResponse.status, 200);
    assert.equal(approveReviewResponse.body.success, true);
    assert.equal(approveReviewResponse.body.data.status, "OPEN");
    assert.equal(approveReviewResponse.body.data.severity, "HIGH");
    assert.equal(
        approveReviewResponse.body.data.reviewRequests.at(-1).status,
        "APPROVED"
    );

    const { bugId: rejectBugId } = await createApprovedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        bugBody: {
            title: "Low severity review",
            description: "This issue probably should not change severity.",
            bugType: "UI",
            environment: "STAGING"
        }
    });

    const requestRejectResponse = await requestSeverityReview({
        projectId,
        bugId: rejectBugId,
        token: memberToken,
        body: {
            reason: "Please review the current severity",
            proposedSeverity: "MEDIUM"
        }
    });

    assert.equal(requestRejectResponse.status, 200);

    const rejectReviewResponse = await rejectSeverityReviewRequest({
        projectId,
        bugId: rejectBugId,
        token: leadToken,
        reason: "Current severity is already accurate"
    });

    assert.equal(rejectReviewResponse.status, 200);
    assert.equal(rejectReviewResponse.body.success, true);
    assert.equal(rejectReviewResponse.body.data.status, "OPEN");
    assert.equal(rejectReviewResponse.body.data.severity, "LOW");
    assert.equal(
        rejectReviewResponse.body.data.reviewRequests.at(-1).status,
        "REJECTED"
    );
});

test("resolved bugs can go through reopen approval and rejection flows", async () => {
    const { projectId, leadToken, memberToken, memberId } = await createProjectTeam();

    const { bugId: reopenApproveBugId } = await createResolvedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        assigneeId: memberId,
        assigneeToken: memberToken,
        bugBody: {
            title: "Resolved bug for reopen approval",
            description: "Will be reopened and approved.",
            bugType: "API",
            environment: "PRODUCTION"
        }
    });

    const requestReopenApproveResponse = await requestReopenRequest({
        projectId,
        bugId: reopenApproveBugId,
        token: memberToken,
        reason: "Issue still happens after deployment"
    });

    assert.equal(requestReopenApproveResponse.status, 200);
    assert.equal(requestReopenApproveResponse.body.data.status, "PENDING_REVIEW");

    const approveReopenResponse = await approveReopenRequest({
        projectId,
        bugId: reopenApproveBugId,
        token: leadToken
    });

    assert.equal(approveReopenResponse.status, 200);
    assert.equal(approveReopenResponse.body.success, true);
    assert.equal(approveReopenResponse.body.data.status, "REOPENED");
    assert.equal(approveReopenResponse.body.data.assignedTo, null);

    const { bugId: reopenRejectBugId } = await createResolvedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        assigneeId: memberId,
        assigneeToken: memberToken,
        bugBody: {
            title: "Resolved bug for reopen rejection",
            description: "Will request reopen and be rejected.",
            bugType: "BACKEND",
            environment: "STAGING"
        }
    });

    const requestReopenRejectResponse = await requestReopenRequest({
        projectId,
        bugId: reopenRejectBugId,
        token: memberToken,
        reason: "Please double check the fix"
    });

    assert.equal(requestReopenRejectResponse.status, 200);

    const rejectReopenResponse = await rejectReopenRequest({
        projectId,
        bugId: reopenRejectBugId,
        token: leadToken,
        reason: "Fix is confirmed working"
    });

    assert.equal(rejectReopenResponse.status, 200);
    assert.equal(rejectReopenResponse.body.success, true);
    assert.equal(rejectReopenResponse.body.data.status, "RESOLVED");
});

test("project members can add, edit, fetch, and delete bug comments", async () => {
    const { projectId, leadToken, memberToken } = await createProjectTeam();

    const { bugId } = await createApprovedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        bugBody: {
            title: "Comment workflow bug",
            description: "Used to verify comment CRUD.",
            bugType: "UI",
            environment: "DEVELOPMENT"
        }
    });

    const addCommentResponse = await addCommentRequest({
        projectId,
        bugId,
        token: memberToken,
        text: "  First investigation note  "
    });

    assert.equal(addCommentResponse.status, 201);
    assert.equal(addCommentResponse.body.success, true);
    assert.equal(addCommentResponse.body.data.text, "First investigation note");

    const commentId = addCommentResponse.body.data._id;

    const getCommentsResponse = await getCommentsRequest({
        projectId,
        bugId,
        token: leadToken
    });

    assert.equal(getCommentsResponse.status, 200);
    assert.equal(getCommentsResponse.body.success, true);
    assert.equal(getCommentsResponse.body.data.comments.length, 1);
    assert.equal(getCommentsResponse.body.data.comments[0].text, "First investigation note");

    const editCommentResponse = await editCommentRequest({
        projectId,
        bugId,
        commentId,
        token: memberToken,
        text: "  Updated investigation note  "
    });

    assert.equal(editCommentResponse.status, 200);
    assert.equal(editCommentResponse.body.success, true);
    assert.equal(editCommentResponse.body.data.text, "Updated investigation note");

    const deleteCommentResponse = await deleteCommentRequest({
        projectId,
        bugId,
        commentId,
        token: memberToken
    });

    assert.equal(deleteCommentResponse.status, 200);
    assert.equal(deleteCommentResponse.body.success, true);
    assert.equal(deleteCommentResponse.body.data.text, "[comment deleted]");
    assert.equal(deleteCommentResponse.body.data.isDeleted, true);

    const getCommentsAfterDeleteResponse = await getCommentsRequest({
        projectId,
        bugId,
        token: leadToken
    });

    assert.equal(getCommentsAfterDeleteResponse.status, 200);
    assert.equal(getCommentsAfterDeleteResponse.body.data.comments.length, 0);
});

test("project read routes return members, bug listings, bug details, stats, and workload", async () => {
    const { projectId, leadToken, memberToken, memberId } = await createProjectTeam();

    const { bugId: openBugId } = await createApprovedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        bugBody: {
            title: "Open bug route coverage",
            description: "Open bug should appear in list and stats.",
            bugType: "API",
            environment: "PRODUCTION"
        }
    });

    const { bugId: resolvedBugId } = await createResolvedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        assigneeId: memberId,
        assigneeToken: memberToken,
        bugBody: {
            title: "Resolved bug route coverage",
            description: "Resolved bug should expose accepted fix details.",
            bugType: "BACKEND",
            environment: "STAGING"
        }
    });

    const { bugId: assignedBugId } = await createAssignedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        assigneeId: memberId,
        bugBody: {
            title: "Assigned bug route coverage",
            description: "Assigned bug should show up in workload.",
            bugType: "UI",
            environment: "DEVELOPMENT"
        }
    });

    const rejectedFixSubmission = await submitFixRequest({
        projectId,
        bugId: assignedBugId,
        token: memberToken,
        body: {
            summary: "Try an unsafe fix first",
            commitUrl: "https://github.com/example/repo/commit/rejected-fix"
        }
    });

    assert.equal(rejectedFixSubmission.status, 201);

    const rejectedFixResponse = await rejectBugFixRequest({
        projectId,
        bugId: assignedBugId,
        fixId: rejectedFixSubmission.body.data.fix._id,
        token: leadToken,
        reason: "Needs another pass"
    });

    assert.equal(rejectedFixResponse.status, 200);

    const membersResponse = await getProjectMembersRequest({
        projectId,
        token: leadToken
    });

    assert.equal(membersResponse.status, 200);
    assert.equal(membersResponse.body.success, true);
    assert.equal(membersResponse.body.data.members.length, 2);
    assert.equal(membersResponse.body.data.lead.email.includes("@example.com"), true);

    const bugsResponse = await getProjectBugsRequest({
        projectId,
        token: leadToken
    });

    assert.equal(bugsResponse.status, 200);
    assert.equal(bugsResponse.body.success, true);
    assert.equal(bugsResponse.body.data.bugs.length, 3);
    assert.equal(bugsResponse.body.data.pagination.total, 3);

    const assignedFilterResponse = await getProjectBugsRequest({
        projectId,
        token: leadToken,
        query: "?status=ASSIGNED"
    });

    assert.equal(assignedFilterResponse.status, 200);
    assert.equal(assignedFilterResponse.body.data.bugs.length, 1);
    assert.equal(assignedFilterResponse.body.data.bugs[0]._id, assignedBugId);

    const bugInfoResponse = await getBugInfoRequest({
        projectId,
        bugId: resolvedBugId,
        token: leadToken
    });

    assert.equal(bugInfoResponse.status, 200);
    assert.equal(bugInfoResponse.body.success, true);
    assert.equal(bugInfoResponse.body.data._id, resolvedBugId);
    assert.equal(Array.isArray(bugInfoResponse.body.data.fixes), true);
    assert.equal(bugInfoResponse.body.data.fixes.length, 1);
    assert.equal(bugInfoResponse.body.data.createdBy.email.includes("@example.com"), true);
    assert.equal(bugInfoResponse.body.data.assignedTo.email.includes("@example.com"), true);

    const statsResponse = await getProjectStatsRequest({
        projectId,
        token: leadToken
    });

    assert.equal(statsResponse.status, 200);
    assert.equal(statsResponse.body.success, true);
    assert.deepEqual(statsResponse.body.data.bugs, {
        total: 3,
        pendingReview: 0,
        open: 1,
        assigned: 1,
        awaitingVerification: 0,
        resolved: 1,
        rejected: 0,
        reviewRequested: 0
    });
    assert.deepEqual(statsResponse.body.data.fixes, {
        total: 2,
        pending: 0,
        accepted: 1,
        rejected: 1
    });

    const workloadResponse = await getDeveloperWorkloadRequest({
        projectId,
        token: leadToken
    });

    assert.equal(workloadResponse.status, 200);
    assert.equal(workloadResponse.body.success, true);
    assert.equal(workloadResponse.body.data.length, 1);
    assert.equal(workloadResponse.body.data[0].developer._id, memberId);
    assert.equal(workloadResponse.body.data[0].assignedBugs, 1);

    assert.notEqual(openBugId, resolvedBugId);
});

test("dashboard routes aggregate project, bug, and fix stats correctly", async () => {
    const { projectId, leadToken, memberToken, memberId } = await createProjectTeam();

    await createApprovedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        bugBody: {
            title: "Reported open bug",
            description: "Stays open after approval.",
            bugType: "API",
            environment: "PRODUCTION"
        }
    });

    await createResolvedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        assigneeId: memberId,
        assigneeToken: memberToken,
        bugBody: {
            title: "Resolved dashboard bug",
            description: "Produces one accepted fix.",
            bugType: "BACKEND",
            environment: "STAGING"
        }
    });

    const { bugId: assignedBugId } = await createAssignedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        assigneeId: memberId,
        bugBody: {
            title: "Assigned dashboard bug",
            description: "Will keep one active assignment after fix rejection.",
            bugType: "UI",
            environment: "DEVELOPMENT"
        }
    });

    const rejectedFixSubmission = await submitFixRequest({
        projectId,
        bugId: assignedBugId,
        token: memberToken,
        body: {
            summary: "Initial rejected fix",
            commitUrl: "https://github.com/example/repo/commit/dashboard-rejected-fix"
        }
    });

    assert.equal(rejectedFixSubmission.status, 201);

    const rejectedFixResponse = await rejectBugFixRequest({
        projectId,
        bugId: assignedBugId,
        fixId: rejectedFixSubmission.body.data.fix._id,
        token: leadToken,
        reason: "Not ready yet"
    });

    assert.equal(rejectedFixResponse.status, 200);

    const myDashboardResponse = await getMyDashboardRequest({
        token: memberToken
    });

    assert.equal(myDashboardResponse.status, 200);
    assert.equal(myDashboardResponse.body.success, true);
    assert.deepEqual(myDashboardResponse.body.data, {
        projectsJoined: 1,
        bugsReported: 3,
        bugsAssigned: 2,
        fixesSubmitted: 2,
        fixesAccepted: 1,
        fixesRejected: 1,
        successRate: 50
    });

    const userDashboardResponse = await getUserDashboardRequest({
        token: leadToken,
        userId: memberId
    });

    assert.equal(userDashboardResponse.status, 200);
    assert.equal(userDashboardResponse.body.success, true);
    assert.equal(userDashboardResponse.body.data.user._id, memberId);
    assert.deepEqual(userDashboardResponse.body.data.stats, {
        projects: 1,
        bugsReported: 3,
        bugsResolved: 1,
        successRate: 50
    });
});

test("leaveProject removes the member and cleans up assigned work and pending fixes", async () => {
    const { projectId, leadToken, memberToken, memberId } = await createProjectTeam();

    const { bugId } = await createAssignedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        assigneeId: memberId,
        bugBody: {
            title: "Leave project cleanup bug",
            description: "Assigned bug should reopen when the member leaves.",
            bugType: "BACKEND",
            environment: "PRODUCTION"
        }
    });

    const submitResponse = await submitFixRequest({
        projectId,
        bugId,
        token: memberToken,
        body: {
            summary: "Pending fix before leaving",
            commitUrl: "https://github.com/example/repo/commit/leave-project-fix"
        }
    });

    assert.equal(submitResponse.status, 201);

    const fixId = submitResponse.body.data.fix._id;

    const leaveResponse = await leaveProjectRequest({
        projectId,
        token: memberToken
    });

    assert.equal(leaveResponse.status, 200);
    assert.equal(leaveResponse.body.success, true);
    assert.equal(leaveResponse.body.message, "You left the project successfully");

    const membersResponse = await getProjectMembersRequest({
        projectId,
        token: leadToken
    });

    assert.equal(membersResponse.status, 200);
    assert.equal(membersResponse.body.data.members.length, 1);

    const projectDoc = await Project.findById(projectId);
    assert.equal(projectDoc.isMember(memberId), false);

    const bugDoc = await Bug.findById(bugId);
    const fixDoc = await BugFix.findById(fixId);

    assert.equal(bugDoc.status, "OPEN");
    assert.equal(bugDoc.assignedTo, null);
    assert.equal(fixDoc.status, "REJECTED");
    assert.equal(fixDoc.rejectionReason, "Developer left the project");

    const blockedMembersResponse = await getProjectMembersRequest({
        projectId,
        token: memberToken
    });

    assert.equal(blockedMembersResponse.status, 403);
});

test("removeMember removes the target member and cancels their pending review state", async () => {
    const { projectId, leadToken, memberToken, memberId } = await createProjectTeam();

    const pendingReviewCreateResponse = await createBugRequest({
        projectId,
        token: memberToken,
        body: {
            title: "Pending review bug from removable member",
            description: "Should be rejected when the member is removed.",
            bugType: "API",
            environment: "STAGING"
        }
    });

    assert.equal(pendingReviewCreateResponse.status, 201);
    const pendingReviewBugId = pendingReviewCreateResponse.body.data._id;

    const { bugId: reviewBugId } = await createApprovedBug({
        projectId,
        reporterToken: memberToken,
        leadToken,
        bugBody: {
            title: "Review request from removable member",
            description: "Pending review should be cancelled when member is removed.",
            bugType: "BACKEND",
            environment: "PRODUCTION"
        }
    });

    const requestReviewResponse = await requestSeverityReview({
        projectId,
        bugId: reviewBugId,
        token: memberToken,
        body: {
            reason: "Please review severity before I am removed",
            proposedSeverity: "HIGH"
        }
    });

    assert.equal(requestReviewResponse.status, 200);

    const removeResponse = await removeMemberRequest({
        projectId,
        token: leadToken,
        userId: memberId
    });

    assert.equal(removeResponse.status, 200);
    assert.equal(removeResponse.body.success, true);
    assert.equal(removeResponse.body.message, "Member removed successfully");

    const projectDoc = await Project.findById(projectId);
    assert.equal(projectDoc.isMember(memberId), false);

    const pendingReviewBug = await Bug.findById(pendingReviewBugId);
    assert.equal(pendingReviewBug.status, "REJECTED");
    assert.equal(pendingReviewBug.isActive, false);

    const reviewBug = await Bug.findById(reviewBugId);
    assert.equal(reviewBug.status, "OPEN");
    assert.equal(reviewBug.reviewRequests.at(-1).status, "CANCELLED");

    const blockedMembersResponse = await getProjectMembersRequest({
        projectId,
        token: memberToken
    });

    assert.equal(blockedMembersResponse.status, 403);
});
