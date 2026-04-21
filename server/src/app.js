
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from "./routes/auth.routes.js"
import projectRouter from "./routes/project.routes.js"
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import { errorHandler } from "./middleware/error.middleware.js";


const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const hasClientBuild = fs.existsSync(path.join(clientDistPath, "index.html"));

if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

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

if (process.env.NODE_ENV === "production" && hasClientBuild) {
    app.use(express.static(clientDistPath));

    app.get("/{*path}", (req, res, next) => {
        if (req.path.startsWith("/api") || req.path === "/health") {
            return next();
        }

        return res.sendFile(path.join(clientDistPath, "index.html"));
    });
}



app.use(errorHandler);


export default app;
