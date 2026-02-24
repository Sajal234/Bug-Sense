import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto";
import { getProjectByIdOrThrow } from "../services/project.js";
import { PROJECT_ROLES } from "../types/index.js";


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
    const project = await Project.findOne({
        inviteCode: normalizedInviteCode,
        isActive: true
    });

    if(!project){
        throw new ApiError(404, "Project not found");
    }

    if(project.isMember(req.user._id)){
        throw new ApiError(409, "You are already a member of this project");
    }


    const memberRole = role || "FULLSTACK";
    if(!PROJECT_ROLES.includes(memberRole)){
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

// get all projects of user
export const getMyProjects = asyncHandler( async(req, res) => {
    const userId = req.user._id;
    const projects = await Project.find({
        $or: [
            { lead: userId },
            { "members.user": userId }
        ]
    })
    .select("-inviteCode")
    .sort({ createdAt : -1})

    return res.status(200)
    .json(
        new ApiResponse(
            projects,
            "Projects fetched successfully"
        )
    );
})

// add member to project
export const addMember = asyncHandler( async(req, res) => {
    const { projectId } = req.params;
    const { role, userId } = req.body;

    if(!userId){
        throw new ApiError(400, "User ID is required");
    }
    const project = await getProjectByIdOrThrow(projectId);
    if(!project.isLead(req.user._id)){
        throw new ApiError(403, "Only project lead can add members")
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    if (project.isMember(userId)) {
        throw new ApiError(409, "User is already a member");
    }

    const user = await User.findById(userId);
    if(!user){
        throw new ApiError(404, "User not found");
    }

    const memberRole = role || "FULLSTACK";
    if(!PROJECT_ROLES.includes(memberRole)){
        throw new ApiError(400, "Invalid role selected");
    }

    project.members.push({
        user : userId,
        role : memberRole
    })

    await project.save();

    return res.status(200)
    .json(
        new ApiResponse(
            project,
            "Member added successfully"
        )
    );
})