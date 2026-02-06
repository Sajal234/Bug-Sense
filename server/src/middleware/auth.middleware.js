import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";


export const verifyJWT = asyncHandler( async(req, res, next) => {

    const token = req.header("Authorization")?.replace("Bearer ", "");
    if(!token){
        throw new ApiError(401, "Unauthorized request");
    }

    let decodedToken;
    try{
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    }
    catch(err){
        throw new ApiError(401, "Invalid access token");
    }
    const user = await User.findById(decodedToken?.userId).select("-passwordHash -refreshToken");
    if(!user){
        throw new ApiError(401, "Invalid access token");
    }

    req.user = user;
    next();
})