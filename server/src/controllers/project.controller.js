import { Project } from "../models/Project.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto";


// creating new project
export const createProject = asyncHandler( async(req, res) => {
    const { name, description } = req.body;

    if(!name || name.trim()===""){
        throw new ApiError(400, "Project name is required");
    }

    // generating invite code
    const generateInviteCode = () => {
        return crypto.randomBytes(4).toString("hex").toUpperCase();
    };

    const project = await Project.create({
                name,
                description,
                lead : req.user._id,
                members : [
                    {
                        user : req.user._id,
                        role : "FULLSTACK"
                    }
                ],
                inviteCode : generateInviteCode()
            })

    return res.status(201).json(
        new ApiResponse(project, "Project created successfully")
    );
})