import { asyncHandler } from "../utils/asyncHandler.js";
import { Project } from "../models/Project.js";
import { Bug } from "../models/Bug.js";
import { BugFix } from "../models/BugFix.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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