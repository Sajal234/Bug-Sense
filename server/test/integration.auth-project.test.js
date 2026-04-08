import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;
let app;
const mongoPort = 43000 + (process.pid % 1000);

const setupEnv = () => {
    process.env.NODE_ENV = "test";
    process.env.CORS_ORIGIN = "http://localhost:5173";
    process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
    process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
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

test.before(async () => {
    setupEnv();
    mongoServer = await MongoMemoryServer.create({
        instance: {
            ip: "127.0.0.1",
            port: mongoPort,
            portGeneration: false,
            args: ["--nounixsocket"]
        }
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
