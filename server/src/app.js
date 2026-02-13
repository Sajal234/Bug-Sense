
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/auth.routes.js"
import projectRouter from "./routes/project.routes.js"
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({ limit: "100kb" }));

app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use(cookieParser());

app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS



// routes
app.use("/api/v1/users", userRouter);

app.use("/api/v1/projects", projectRouter);


export default app;
