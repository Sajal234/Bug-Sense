
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/auth.routes.js"
import projectRouter from "./routes/project.routes.js"


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({ limit: "16kb" }));

app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use(cookieParser());



// routes
app.use("/api/v1/users", userRouter);

app.use("/api/v1/projects", projectRouter);

export default app;
