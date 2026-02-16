import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getProjectByIdOrThrow } from "../services/project.js";
import { calculateSeverity } from "../services/severityEngine.js";
import { Bug } from "../models/Bug.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { BUG_STATUS, BUG_SEVERITY, BUG_ENVIRONMENT, BUG_TYPE } from "../types/index.js";
import { getBugByIdOrThrow } from "../services/bug.js";


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

// get all bugs of a project
export const getProjectBugs = asyncHandler( async(req, res) => {

    const { projectId } = req.params;

    const project = await getProjectByIdOrThrow(projectId);

    const {
        status,
        severity,
        page=1,
        limit=10,
        assignedTo,
        createdBy,
        bugType
    } = req.query;


    if(status && !Object.values(BUG_STATUS).includes(status)){
        throw new ApiError(400, "Invalid bug status");
    }

    if(severity && !Object.values(BUG_SEVERITY).includes(severity)){
        throw new ApiError(400, "Invalid bug severity");    
    }

    if (bugType && !Object.values(BUG_TYPE).includes(bugType)) {
        throw new ApiError(400, "Invalid bug type filter");
    }



    if(!project.isMember(req.user._id)){
        throw new ApiError(403, "You are not a member of this project");
    }


    // dynamic query
    const filter = { 
        project: projectId,
        isActive : true
     };

    if(status)
        filter.status = status;
    if(severity)
        filter.severity = severity;
    if(assignedTo)
        filter.assignedTo = assignedTo;
    if(createdBy)
        filter.createdBy = createdBy;
    if(bugType)
        filter.bugType = bugType;


    // Pagination
    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const limitNumber = Math.max(Math.min(parseInt(limit) || 10, 50), 1);
    const skip = (pageNumber - 1) * limitNumber;
    
    // fetching all bugs
    const bugs = await Bug.find(filter)
        .sort({createdAt : -1})
        .skip(skip)
        .limit(limitNumber)
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email")

    // total page counts of bugs
     const total = await Bug.countDocuments(filter);

    return res.status(200).json(
        new ApiResponse(
            {
                bugs,
                pagination: {
                    total,
                    page: pageNumber,
                    limit: limitNumber,
                    pages: Math.ceil(total / limitNumber)
                }
            },
            "Project bugs fetched successfully"
        )
    );

})

// approve bug
export const approveBug = asyncHandler( async(req, res) => {

    const { projectId, bugId } = req.params;
    const { severity } = req.body;

    if (severity && !Object.values(BUG_SEVERITY).includes(severity)) {
        throw new ApiError(400, "Invalid severity value");
    }

    const project = await getProjectByIdOrThrow(projectId);
    if(!project.isLead(req.user._id)){
        throw new ApiError(403, "Only project lead can approve bugs");
    }

    const bug = await getBugByIdOrThrow(bugId, projectId);

    if(bug.status !== BUG_STATUS.PENDING_REVIEW){
        throw new ApiError(400, "Bug is not in pending state");
    }

    const previousState = bug.status;
    
    const finalSeverity = severity || bug.suggestedSeverity || BUG_SEVERITY.MEDIUM;
    
    if(bug.severity!==finalSeverity){
        bug.history.push({
            action : "Severity updated",
            from : bug.severity,
            to : finalSeverity,
            by : req.user._id
        });
    }
    
    bug.severity = finalSeverity;
    bug.status = BUG_STATUS.OPEN;

    bug.history.push({
        action : "Bug approved",
        from : previousState,
        to : BUG_STATUS.OPEN,
        by : req.user._id
    })

    await bug.save();

    return res.status(200).json(
        new ApiResponse(bug, "Bug approved successfully")
    );

})

// reject bug
export const rejectBug = asyncHandler( async(req, res) => {
    const {projectId, bugId} = req.params;
    const {reason} = req.body;

    if(!reason || !reason.trim()){
        throw new ApiError(400, "Rejection reason is required");
    }

    const project = await getProjectByIdOrThrow(projectId);
    if(!project.isLead(req.user._id)){
        throw new ApiError(403, "Only project lead can reject bugs");
    }

    const bug = await getBugByIdOrThrow(bugId, projectId);
    if(bug.status!==BUG_STATUS.PENDING_REVIEW){
        throw new ApiError(400, "Bug is not in pending state");
    }

    const previousState = bug.status;
    bug.status = BUG_STATUS.REJECTED;

    bug.history.push({
        action : "Bug rejected",
        from : previousState,
        to : BUG_STATUS.REJECTED,
        by : req.user._id,
        meta : reason.trim()
    })

    await bug.save();

    return res.status(200).json(
        new ApiResponse(bug, "Bug rejected successfully")
    )
})