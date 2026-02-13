import { Router } from "express";
import { createProject, getMyProjects, joinProject } from "../controllers/project.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { createBug } from "../controllers/bug.controller.js";
import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: "Too many attempts, please try again later"
});

const router = Router();

router.route("/").post(authLimiter, verifyJWT, createProject);

router.route("/join").post(authLimiter, verifyJWT, joinProject);

router.route("/my-projects").get(authLimiter, verifyJWT, getMyProjects);

router.route("/:projectId/bugs").post(authLimiter, verifyJWT, createBug);

export default router;