import { asyncHandler } from "../utils/asyncHandler.js";
import { Project } from "../models/Project.js";
import { Bug } from "../models/Bug.js";
import { BugFix } from "../models/BugFix.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";
import { User } from "../models/User.js";

export const getMyDashboard = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    const [
        projectsJoined,
        bugsReported,
        bugsAssigned,
        fixesSubmitted,
        fixesAccepted,
        fixesRejected
    ] = await Promise.all([

        // projects
        Project.countDocuments({
            $or: [
                { lead: userId },
                { "members.user": userId }
            ]
        }),

        // bugs created
        Bug.countDocuments({
            createdBy: userId,
            isActive: true
        }),

        // bugs assigned
        Bug.countDocuments({
            assignedTo: userId,
            isActive: true
        }),

        // fixes submitted
        BugFix.countDocuments({
            submittedBy: userId
        }),

        // fixes accepted
        BugFix.countDocuments({
            submittedBy: userId,
            status: "ACCEPTED"
        }),

        // fixes rejected
        BugFix.countDocuments({
            submittedBy: userId,
            status: "REJECTED"
        })
    ]);

    const successRate = fixesSubmitted === 0 ? 0 : Math.round((fixesAccepted / fixesSubmitted) * 100);

    return res.status(200).json(
        new ApiResponse(
            {
                projectsJoined,
                bugsReported,
                bugsAssigned,
                fixesSubmitted,
                fixesAccepted,
                fixesRejected,
                successRate
            },
            "Dashboard data fetched successfully"
        )
    );
});

export const getUserDashboard = asyncHandler( async(req, res) => {
    const {userId} = req.params;

    if(!mongoose.Types.ObjectId.isValid(userId)){
        throw new ApiError(400, "Invalid User ID")
    }

    const user = await User.findById(userId)
    .select("name");

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const userObjectId = user._id;

    const [
        projects,
        bugsReported,
        bugsResolved,
        fixesSubmitted
    ] = await Promise.all([

        // projects user is part of
        Project.countDocuments({
            $or: [
                { lead: userObjectId },
                { "members.user": userObjectId }
            ]
        }),

        // bugs created
        Bug.countDocuments({
            createdBy: userObjectId,
            isActive: true
        }),

        // resolved bugs (based on accepted fixes)
        BugFix.countDocuments({
            submittedBy: userObjectId,
            status: "ACCEPTED"
        }),

        // total fixes
        BugFix.countDocuments({
            submittedBy: userObjectId
        })
    ]);

    const fixesAccepted = bugsResolved; 

    const successRate =
        fixesSubmitted > 0
            ? Math.round((fixesAccepted / fixesSubmitted) * 100)
            : 0;

    return res.status(200).json(
        new ApiResponse(
            {
                user,
                stats: {
                    projects,
                    bugsReported,
                    bugsResolved,
                    successRate
                }
            },
            "User dashboard fetched successfully"
        )
    )
})