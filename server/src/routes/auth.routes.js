
import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: "Too many attempts, please try again later"
});

const router = Router();

router.route("/register").post(authLimiter, registerUser);

router.route("/login").post(authLimiter, loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(authLimiter, refreshAccessToken);

export default router;