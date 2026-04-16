
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/auth.routes.js"
import projectRouter from "./routes/project.routes.js"
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import { errorHandler } from "./middleware/error.middleware.js";


const app = express();

app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = (process.env.CORS_ORIGIN || "")
            .split(",")
            .map((allowedOrigin) => allowedOrigin.trim())
            .filter(Boolean);

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));

app.use(express.json({ limit: "100kb" }));

app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use(cookieParser());

// app.use(mongoSanitize()); // Prevent NoSQL injection
// app.use(xss()); // Prevent XSS


app.get("/health", (_req, res) => {
    return res.status(200).json({
        success: true,
        status: "ok",
    });
});


// routes
app.use("/api/v1/users", userRouter);

app.use("/api/v1/projects", projectRouter);




app.use(errorHandler);


export default app;
