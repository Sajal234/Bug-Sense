
import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getMyDashboard, getUserDashboard } from "../controllers/user.controller.js";
import rateLimit from 'express-rate-limit';

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: "Too many attempts, please try again later",
    skipSuccessfulRequests: true
});

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "Too many session refresh requests, please try again shortly"
});

const router = Router();

router.route("/register").post(authLimiter, registerUser);

router.route("/login").post(authLimiter, loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshLimiter, refreshAccessToken);

router.route("/change-password").post(verifyJWT, changePassword);


// Dashboards
router.route("/me/dashboard")
.get(generalLimiter, verifyJWT, getMyDashboard);

router.route("/:userId/dashboard")
.get(generalLimiter, verifyJWT, getUserDashboard)

export default router;
