import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";
import { getMyDashboard } from "../controllers/user.controller.js";

const router = Router();

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

router.route("/me/dashboard")
.get(generalLimiter, verifyJWT, getMyDashboard);

export default router;