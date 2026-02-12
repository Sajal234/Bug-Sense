import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getProjectByIdOrThrow } from "../services/project.js";
import { calculateSeverity } from "../services/severityEngine.js";
import { Bug } from "../models/Bug.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { BUG_STATUS, BUG_SEVERITY, BUG_ENVIRONMENT, BUG_TYPE } from "../types/index.js";


export const createBug = asyncHandler( async(req, res) => {
    const {
        title,
        description,
        bugType,
        environment,
        stackTrace,
        moduleName
    } = req.body;

    const { projectId } = req.params;

    // validating required fields
    if (!projectId) {
        throw new ApiError(400, "Project ID is required");
    }

    if (
        !title?.trim() ||
        !description?.trim() ||
        !bugType ||
        !environment
    ){
        throw new ApiError(400, "All required fields must be provided");
    }

    if (!Object.values(BUG_ENVIRONMENT).includes(environment)) {
        throw new ApiError(400, "Invalid environment");
    }

    if (!Object.values(BUG_TYPE).includes(bugType)) {
        throw new ApiError(400, "Invalid bug type");
    }


    // checking if user is a member of the project
    const project = await getProjectByIdOrThrow(projectId);

    if(!project.isMember(req.user._id)){
        throw new ApiError(403, "You are not a member of this project");
    }
    
    // calculate severity
    const { suggestedSeverity } = calculateSeverity({
        title,
        description,
        environment
    });

    // create bug
    const bug = await Bug.create({
        title,
        description,
        project : projectId,
        createdBy : req.user._id,
        severity : BUG_SEVERITY.UNCONFIRMED,
        assignedTo : null,
        suggestedSeverity,
        bugType,
        status : BUG_STATUS.PENDING_REVIEW,
        environment,
        stackTrace,
        moduleName,
        history : [{
            action : "Bug created",
            from : null,
            to : BUG_STATUS.PENDING_REVIEW,
            by : req.user._id
        }]
    });

    return res.status(201).json(
        new ApiResponse(bug, "Bug created successfully")
    )
})