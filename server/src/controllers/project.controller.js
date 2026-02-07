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

    let project;
    let attempts = 0;

    while (!project && attempts < 3) {
        try {
            project = await Project.create({
                name,
                description,
                lead: req.user._id,
                members: [{ user: req.user._id, role: "FULLSTACK" }],
                inviteCode: generateInviteCode()
            });
        } catch (err) {
            if (err.code !== 11000) throw err;
            attempts++;
        }
    }

    if (!project) {
        throw new ApiError(500, "Failed to generate unique invite code");
    }

    return res.status(201).json(
        new ApiResponse(project, "Project created successfully")
    );
})

// joining project
export const joinProject = asyncHandler( async(req, res) => {
    const { inviteCode, role } = req.body;

    if(!inviteCode || inviteCode.trim()===""){
        throw new ApiError(400, "Invite code is required");
    }

    const normalizedInviteCode = inviteCode.trim().toUpperCase();
    const project = await Project.findOne({inviteCode: normalizedInviteCode});

    if(!project){
        throw new ApiError(404, "Project not found");
    }

    if(project.isMember(req.user._id)){
        throw new ApiError(409, "You are already a member of this project");
    }

    const allowedRoles = ["FULLSTACK", "FRONTEND", "BACKEND", "QA", "DESIGNER", "OTHER"];

    const memberRole = role || "FULLSTACK";
    if(!allowedRoles.includes(memberRole)){
        throw new ApiError(400, "Invalid role selected");
    }

    project.members.push({
        user : req.user._id,
        role : memberRole
    })

    await project.save();

    return res.status(200)
    .json(
        new ApiResponse(
            project,
            "Project joined successfully"
        )
    )    
})