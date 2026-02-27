import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto";
import { getProjectByIdOrThrow } from "../services/project.js";
import { BUG_ACTIONS, BUG_STATUS, PROJECT_ROLES } from "../types/index.js";
import { Bug } from "../models/Bug.js";
import { BugFix } from "../models/BugFix.js";


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

// remove member from project
export const removeMember = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const project = await getProjectByIdOrThrow(projectId);

    if (!project.isLead(req.user._id)) {
        throw new ApiError(403, "Only project lead can remove members");
    }

    if (project.lead.toString() === userId) {
        throw new ApiError(400, "Project lead cannot be removed");
    }

    if (!project.isMember(userId)) {
        throw new ApiError(404, "User is not a project member");
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Handle Assigned Bugs
        const assignedBugs = await Bug.find({
            project: projectId,
            assignedTo: userId,
            status: { 
                $in: [BUG_STATUS.ASSIGNED, BUG_STATUS.AWAITING_VERIFICATION] 
            }
        }).session(session);

        for (const bug of assignedBugs) {

            // If awaiting verification → reject pending fix
            if (bug.status === BUG_STATUS.AWAITING_VERIFICATION) {
                const pendingFix = await BugFix.findOne({
                    bug: bug._id,
                    status: "PENDING"
                }).session(session);

                if (pendingFix) {
                    pendingFix.status = "REJECTED";
                    pendingFix.rejectionReason = "Developer removed from project";
                    await pendingFix.save({ session });
                }
            }

            const previousState = bug.status;

            bug.assignedTo = null;
            bug.status = BUG_STATUS.OPEN;

            bug.history.push({
                action: BUG_ACTIONS.STATUS_UPDATED,
                from: previousState,
                to: BUG_STATUS.OPEN,
                by: req.user._id,
                meta: "Developer removed from project"
            });

            await bug.save({ session });
        }


        // Reject Pending Review Bugs Created By Removed User
        const pendingReviewBugs = await Bug.find({
            project: projectId,
            createdBy: userId,
            status: BUG_STATUS.PENDING_REVIEW
        }).session(session);

        for (const bug of pendingReviewBugs) {
            const previousState = bug.status;

            bug.status = BUG_STATUS.REJECTED;
            bug.isActive = false;
            bug.reviewRequests = [];

            bug.history.push({
                action: BUG_ACTIONS.BUG_REJECTED,
                from: previousState,
                to: BUG_STATUS.REJECTED,
                by: req.user._id,
                meta: "Reporter removed from project"
            });

            await bug.save({ session });
        }

        // Cancel Review Requests Made By Removed User
        const reviewRequestBugs = await Bug.find({
            project: projectId,
            reviewRequests: {
                $elemMatch: {
                    requestedBy: userId,
                    status: "PENDING"
                }
            }
        }).session(session);

        for (const bug of reviewRequestBugs) {

            // cancel review requests in array
            bug.reviewRequests = bug.reviewRequests.map(req => {
                if (
                    req.requestedBy.toString() === userId &&
                    req.status === "PENDING"
                ) {
                    req.status = "CANCELLED";
                }
                return req;
            });

            // add history
            bug.history.push({
                action: "Review request cancelled",
                from: null,
                to: null,
                by: req.user._id,
                meta: "Requester removed from project"
            });

            await bug.save({ session });
        }


        // Reject Any Remaining Pending Fixes Submitted By User In THIS Project
        await BugFix.updateMany(
            {
                project: projectId,
                submittedBy: userId,
                status: "PENDING",
            },
            {
                $set: {
                    status: "REJECTED",
                    rejectionReason: "Developer removed from project"
                }
            },
            { session }
        );

        // Remove Member From Project
        project.members = project.members.filter(
            member => member.user.toString() !== userId
        );

        await project.save({ session });

        await session.commitTransaction();
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }

    return res.status(200).json(
        new ApiResponse(project, "Member removed successfully")
    );
});
