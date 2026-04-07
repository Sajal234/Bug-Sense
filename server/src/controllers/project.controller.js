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

    if(!name || typeof name !== "string" || name.trim()===""){
        throw new ApiError(400, "Project name is required");
    }

    const normalizedName = name.trim();

    // generating invite code
    const generateInviteCode = () => {
        return crypto.randomBytes(4).toString("hex").toUpperCase();
    };

    let project;
    let attempts = 0;

    while (!project && attempts < 3) {
        try {
            project = await Project.create({
                name: normalizedName,
                description: typeof description === "string" ? description.trim() : description,
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

    if (!inviteCode || typeof inviteCode !== "string" || inviteCode.trim() === "") {
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


    const memberRole = role === undefined ? "FULLSTACK" : role;

    if (typeof memberRole !== "string" || memberRole.trim() === "") {
        throw new ApiError(400, "Invalid role selected");
    }

    const normalizedRole = memberRole.trim().toUpperCase();

    if (!PROJECT_ROLES.includes(normalizedRole)) {
        throw new ApiError(400, "Invalid role selected");
    }

    project.members.push({
        user : req.user._id,
        role : normalizedRole
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

            let restoreStatus = null;

            bug.reviewRequests = bug.reviewRequests.map(r => {
                if (
                    r.requestedBy.toString() === userId &&
                    r.status === "PENDING"
                ) {
                    r.status = "CANCELLED";
                    restoreStatus = r.previousStatus;
                }
                return r;
            });

            if (bug.status === BUG_STATUS.REVIEW_REQUESTED && restoreStatus) {

                let finalStatus;

                if (restoreStatus === BUG_STATUS.ASSIGNED && !bug.assignedTo) {
                    finalStatus = BUG_STATUS.OPEN;
                } else {
                    finalStatus = restoreStatus;
                }

                const prev = bug.status;
                bug.status = finalStatus;

                bug.history.push({
                    action: BUG_ACTIONS.STATUS_UPDATED,
                    from: prev,
                    to: finalStatus,
                    by: req.user._id,
                    meta: "Severity review cancelled due to member removal"
                });
            }
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

        // Handling resolved bugs
        await Bug.updateMany(
            { project: projectId, assignedTo: userId, status: BUG_STATUS.RESOLVED },
            { $set: { assignedTo: null } },
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

// get project members
export const getProjectMembers = asyncHandler( async(req, res) => {
    const { projectId } = req.params;

    const project = await getProjectByIdOrThrow(projectId);

    if(!project.isMember(req.user._id)){
        throw new ApiError(403, "You are not a member of this project")
    }

    await project.populate([
        {path : "lead", select : "name email"},
        {path : "members.user", select : "name email"}
    ]);

    return res.status(200).json(
        new ApiResponse(
            {
                lead : project.lead,
                members : project.members
            }
            , "Project members fetched successfully")
    );
})

// transfer project lead
export const transferProjectLead = asyncHandler( async(req, res) => {
    const { projectId } = req.params;
    const { newLeadId } = req.body;

    if(!mongoose.Types.ObjectId.isValid(newLeadId)){
        throw new ApiError(400, "Invalid new lead ID")
    }

    const project = await getProjectByIdOrThrow(projectId);

    if(!project.isLead(req.user._id)){
        throw new ApiError(403, "Only project lead can transfer leadership")
    }

    if(!project.isMember(newLeadId)){
        throw new ApiError(403, "New lead is not a member of this project")
    }

    if(project.lead.toString() === newLeadId.toString()){
        throw new ApiError(400, "User is already the project lead");
    }

    project.lead = newLeadId;
    await project.save();

    return res.status(200).json(
        new ApiResponse(project, "Project leadership transferred successfully")
    );
})

// leave project
export const leaveProject = asyncHandler(async (req, res) => {

    const { projectId } = req.params;
    const userId = req.user._id;

    const project = await getProjectByIdOrThrow(projectId);

    if (!project.isMember(userId)) {
        throw new ApiError(403, "You are not a member of this project");
    }

    if (project.isLead(userId)) {
        throw new ApiError(400,"Project lead cannot leave. Transfer leadership first.");
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

            // Reject pending fix if awaiting verification
            if (bug.status === BUG_STATUS.AWAITING_VERIFICATION) {

                const pendingFix = await BugFix.findOne({
                    bug: bug._id,
                    status: "PENDING"
                }).session(session);

                if (pendingFix) {
                    pendingFix.status = "REJECTED";
                    pendingFix.rejectionReason = "Developer left the project";
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
                by: userId,
                meta: "Developer left project"
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
                by: userId,
                meta: "Reporter left the project"
            });

            await bug.save({ session });
        }

        // Cancel Review Requests made by this user
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

            let restoreStatus = null;

            bug.reviewRequests = bug.reviewRequests.map(r => {
                if (
                    r.requestedBy.toString() === userId.toString() &&
                    r.status === "PENDING"
                ) {
                    r.status = "CANCELLED";
                    restoreStatus = r.previousStatus;
                }
                return r;
            });

            if (bug.status === BUG_STATUS.REVIEW_REQUESTED && restoreStatus) {

                let finalStatus;

                if (restoreStatus === BUG_STATUS.ASSIGNED && !bug.assignedTo) {
                    finalStatus = BUG_STATUS.OPEN;
                } else {
                    finalStatus = restoreStatus;
                }

                const prev = bug.status;
                bug.status = finalStatus;

                bug.history.push({
                    action: BUG_ACTIONS.STATUS_UPDATED,
                    from: prev,
                    to: finalStatus,
                    by: userId,
                    meta: "Severity review cancelled due to developer leaving"
                });
            }

            await bug.save({ session });
        }

        // Reject pending fixes submitted by user
        await BugFix.updateMany(
            {
                project: projectId,
                submittedBy: userId,
                status: "PENDING"
            },
            {
                $set: {
                    status: "REJECTED",
                    rejectionReason: "Developer left the project"
                }
            },
            { session }
        );

        // Remove assignment from resolved bugs
        await Bug.updateMany(
            {
                project: projectId,
                assignedTo: userId,
                status: BUG_STATUS.RESOLVED
            },
            { $set: { assignedTo: null } },
            { session }
        );

        // Remove member from project
        project.members = project.members.filter(
            member => member.user.toString() !== userId.toString()
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
        new ApiResponse(null, "You left the project successfully")
    );
});

// project stats
export const getProjectStats = asyncHandler(async (req, res) => {

    const { projectId } = req.params;

    const project = await getProjectByIdOrThrow(projectId);

    if (!project.isMember(req.user._id)) {
        throw new ApiError(403, "You are not a member of this project");
    }

    const projectObjectId = new mongoose.Types.ObjectId(projectId);

    const baseBugFilter = {
        project: projectObjectId,
        isActive: true
    };

    const [
        totalBugs,
        open,
        assigned,
        awaitingVerification,
        resolved,
        rejected,
        reviewRequested,
        totalFixes,
        pendingFixes,
        acceptedFixes,
        rejectedFixes
    ] = await Promise.all([
        Bug.countDocuments(baseBugFilter),
        Bug.countDocuments({ ...baseBugFilter, status: BUG_STATUS.OPEN }),
        Bug.countDocuments({ ...baseBugFilter, status: BUG_STATUS.ASSIGNED }),
        Bug.countDocuments({ ...baseBugFilter, status: BUG_STATUS.AWAITING_VERIFICATION }),
        Bug.countDocuments({ ...baseBugFilter, status: BUG_STATUS.RESOLVED }),
        Bug.countDocuments({ ...baseBugFilter, status: BUG_STATUS.REJECTED }),
        Bug.countDocuments({ ...baseBugFilter, status: BUG_STATUS.REVIEW_REQUESTED }),

        BugFix.countDocuments({ project: projectObjectId }),
        BugFix.countDocuments({ project: projectObjectId, status: "PENDING" }),
        BugFix.countDocuments({ project: projectObjectId, status: "ACCEPTED" }),
        BugFix.countDocuments({ project: projectObjectId, status: "REJECTED" })
    ]);

    return res.status(200).json(
        new ApiResponse(
            {
                bugs: {
                    total: totalBugs,
                    open,
                    assigned,
                    awaitingVerification,
                    resolved,
                    rejected,
                    reviewRequested
                },
                fixes: {
                    total: totalFixes,
                    pending: pendingFixes,
                    accepted: acceptedFixes,
                    rejected: rejectedFixes
                }
            },
            "Project statistics fetched successfully"
        )
    );
});

// developer workload
export const getDeveloperWorkload = asyncHandler(async (req, res) => {

    const { projectId } = req.params;

    const project = await getProjectByIdOrThrow(projectId);

    if (!project.isMember(req.user._id)) {
        throw new ApiError(403, "You are not a member of this project");
    }

    const workload = await Bug.aggregate([
        {
            $match: {
                project: new mongoose.Types.ObjectId(projectId),
                status: BUG_STATUS.ASSIGNED,
                assignedTo: { $ne: null },
                isActive: true
            }
        },
        {
            $group: {
                _id: "$assignedTo",
                assignedBugs: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "developer"
            }
        },
        {
            $unwind: "$developer"
        },
        {
            $project: {
                _id: 0,
                developer: {
                    _id: "$developer._id",
                    name: "$developer.name",
                    email: "$developer.email"
                },
                assignedBugs: 1
            }
        },
        {
            $sort: { assignedBugs: -1 }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(workload, "Developer workload fetched successfully")
    );
});

// change role
export const changeMemberRole = asyncHandler( async(req, res) => {
    const { projectId, userId } = req.params;
    const { role } = req.body;

    if(!mongoose.Types.ObjectId.isValid(userId)){
        throw new ApiError(400, "Invalid user ID")
    } 

    if (!role || typeof role !== "string" || role.trim() === "") {
        throw new ApiError(400, "Role is required");
    }

    const normalizedRole = role.trim().toUpperCase();

    if(!PROJECT_ROLES.includes(normalizedRole)){
        throw new ApiError(400, "Invalid role selected")
    }

    const project = await getProjectByIdOrThrow(projectId);

    if(!project.isLead(req.user._id)){
        throw new ApiError(403, "Only project lead can change member roles")
    }

    if(project.lead.toString() === userId.toString()){
        throw new ApiError(400, "Cannot change role of the project lead")
    }

    const member = project.members.find(
        member => member.user.toString() === userId.toString()
    )

    if(!member){
        throw new ApiError(404, "Member not found in the project")
    }

    if(member.role === normalizedRole){
        throw new ApiError(400, "Member already has this role")
    }

    member.role = normalizedRole;
    await project.save();

    return res.status(200).json(
        new ApiResponse(project, "Member role updated successfully")
    )
})