import { Router } from "express";
import { createProject, getMyProjects, joinProject } from "../controllers/project.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createProject);

router.route("/join").post(verifyJWT, joinProject);

router.route("/my-projects").get(verifyJWT, getMyProjects);

export default router;