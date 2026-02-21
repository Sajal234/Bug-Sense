import { Router } from "express";
import { createProject, getMyProjects, joinProject } from "../controllers/project.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { approveBug, assignBug, createBug, getBugInfo, getProjectBugs, rejectBug, submitFix } from "../controllers/bug.controller.js";
import rateLimit from 'express-rate-limit';


const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many attempts, please try again later"
});


const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: "Too many attempts, please try again later"
});

const router = Router();

router.route("/").post(authLimiter, verifyJWT, createProject);

router.route("/join").post(authLimiter, verifyJWT, joinProject);

router.route("/my-projects").get(verifyJWT, getMyProjects);

router.route("/:projectId/bugs")
.post(generalLimiter, verifyJWT, createBug)
.get(verifyJWT, getProjectBugs);

router.route("/:projectId/bugs/:bugId/approve")
.patch(generalLimiter, verifyJWT, approveBug);

router.route("/:projectId/bugs/:bugId/reject")
.patch(generalLimiter, verifyJWT, rejectBug);

router.route("/:projectId/bugs/:bugId/")
.get(generalLimiter, verifyJWT, getBugInfo);

router.route("/:projectId/bugs/:bugId/assign")
.patch(generalLimiter, verifyJWT, assignBug);

router.route("/:projectId/bugs/:bugId/fix")
.patch(generalLimiter, verifyJWT, submitFix);

export default router;