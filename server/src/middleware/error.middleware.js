import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    let error = err;

    // Normalization: Ensure all errors follow the ApiError structure
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || (error instanceof mongoose.Error ? 400 : 500);
        const message = error.message || "Something went wrong";
        error = new ApiError(statusCode, message, error?.errors || [], err.stack);
    }

    let { statusCode, message, errors } = error;
    
    // Invalid ObjectId
    if (err instanceof mongoose.Error.CastError) {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // Duplicate key
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
    }

    // Validation error
    if (err instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        message = "Validation failed";
        errors = Object.values(err.errors).map((e) => e.message);
    }

    // JWT errors
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
        ...(isDev && { stack: error.stack }), 
    });
};

export { errorHandler };
