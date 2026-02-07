import { Router } from "express";
import { createProject, joinProject } from "../controllers/project.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createProject);

router.route("/join").post(verifyJWT, joinProject);

export default router;