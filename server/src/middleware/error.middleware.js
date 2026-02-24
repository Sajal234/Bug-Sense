import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    let errors = err.errors || [];

    if (err instanceof mongoose.Error.CastError) {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
    }

    if (err instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        message = "Validation failed";
        errors = Object.values(err.errors).map((e) => e.message);
    }

    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token";
    }

    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token has expired";
    }

    const isDev = process.env.NODE_ENV === "development";

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors,
        ...(isDev && { stack: err.stack }), 
    });
};

export { errorHandler };
