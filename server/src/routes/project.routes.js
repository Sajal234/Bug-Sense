import { Router } from "express";
import { createProject, getMyProjects, joinProject } from "../controllers/project.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    acceptBugFix,
    approveBug, approveReopen,
    assignBug, createBug, getBugInfo,
    getProjectBugs, rejectBug, rejectBugFix, rejectReopen, requestReopen,
    submitFix 
} from "../controllers/bug.controller.js";
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

router.route("/:projectId/bugs/:bugId")
.get(generalLimiter, verifyJWT, getBugInfo);

router.route("/:projectId/bugs/:bugId/assign")
.patch(generalLimiter, verifyJWT, assignBug);

router.route("/:projectId/bugs/:bugId/fix")
.post(generalLimiter, verifyJWT, submitFix);

router.route("/:projectId/bugs/:bugId/request-reopen")
.patch(generalLimiter, verifyJWT, requestReopen);

router.route("/:projectId/bugs/:bugId/approve-reopen")
.patch(generalLimiter, verifyJWT, approveReopen);

router.route("/:projectId/bugs/:bugId/reject-reopen")
.patch(generalLimiter, verifyJWT, rejectReopen);

router.route("/:projectId/bugs/:bugId/fixes/:fixId/accept")
.patch(generalLimiter, verifyJWT, acceptBugFix);

router.route("/:projectId/bugs/:bugId/fixes/:fixId/reject")
.patch(generalLimiter, verifyJWT, rejectBugFix);

export default router;