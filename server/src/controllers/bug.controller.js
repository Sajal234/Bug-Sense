import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getProjectByIdOrThrow } from "../services/project.js";
import { calculateSeverity } from "../services/severityEngine.js";
import { Bug } from "../models/Bug.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { BUG_STATUS, BUG_SEVERITY, BUG_ENVIRONMENT, BUG_TYPE, BUG_ACTIONS } from "../types/index.js";
import { getBugByIdOrThrow } from "../services/bug.js";
import mongoose from "mongoose";
import { BugFix } from "../models/BugFix.js";


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
            action : BUG_ACTIONS.BUG_CREATED,
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

    const {isActive} = req.query;

    if (isActive !== undefined && !["true", "false"].includes(isActive)) {
        throw new ApiError(400, "Invalid isActive value");
    }
    
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
    };

    if (isActive !== undefined) {
        filter.isActive = isActive === "true";
    } else {
        filter.isActive = true;
    }

    if(status)
        filter.status = status;
    if(severity)
        filter.severity = severity;
    if (assignedTo) {
        if (!mongoose.Types.ObjectId.isValid(assignedTo))
            throw new ApiError(400, "Invalid assignedTo user ID");
        filter.assignedTo = assignedTo;
    }
    if (createdBy) {
        if (!mongoose.Types.ObjectId.isValid(createdBy))
            throw new ApiError(400, "Invalid createdBy user ID");
        filter.createdBy = createdBy;
    }
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

    const lastHistory = bug.history[bug.history.length - 1];

    if (lastHistory?.action === BUG_ACTIONS.REOPEN_REQUESTED) {
        throw new ApiError(400, "Use approve-reopen endpoint for reopen requests");
    }

    const previousState = bug.status;
    
    const finalSeverity = severity || bug.suggestedSeverity || BUG_SEVERITY.MEDIUM;
    
    if(bug.severity!==finalSeverity){
        bug.history.push({
            action : BUG_ACTIONS.SEVERITY_UPDATED,
            from : bug.severity,
            to : finalSeverity,
            by : req.user._id
        });
    }
    
    bug.severity = finalSeverity;
    bug.status = BUG_STATUS.OPEN;

    bug.history.push({
        action : BUG_ACTIONS.BUG_APPROVED,
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

    const lastHistory = bug.history[bug.history.length - 1];

    if (lastHistory?.action === BUG_ACTIONS.REOPEN_REQUESTED) {
        throw new ApiError(400, "Use reject-reopen endpoint for reopen requests");
    }

    const previousState = bug.status;
    bug.status = BUG_STATUS.REJECTED;

    bug.history.push({
        action : BUG_ACTIONS.BUG_REJECTED,
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

// get bug info
export const getBugInfo = asyncHandler( async(req, res) => {
    const { projectId, bugId } = req.params;
    const project = await getProjectByIdOrThrow(projectId);

    if(!project.isMember(req.user._id)){
        throw new ApiError(403, "You are not a member of this project");
    }

    const bug = await getBugByIdOrThrow(bugId, projectId)

    await bug.populate([
        { path: "createdBy", select: "name email" },
        { path: "assignedTo", select: "name email" },
        { path: "history.by", select: "name email" },
        { path: "reviewRequests.requestedBy", select: "name email" },
        { path: "fixes" }
    ]);
    return res.status(200).json(
        new ApiResponse(bug, "Bug details fetched successfully")
    )
})

// assign bug
export const assignBug = asyncHandler( async(req, res) => {
    const {bugId, projectId} = req.params;
    const project = await getProjectByIdOrThrow(projectId);
    const {assignedTo} = req.body;

    if(!assignedTo){
        throw new ApiError(400, "Assignee user id is required");
    }

    if(!mongoose.Types.ObjectId.isValid(assignedTo)){
        throw new ApiError(400, "Invalid user id format")
    }

    if(!project.isLead(req.user._id)){
        throw new ApiError(403, "Only project lead can assign bugs")
    }
    
    if(!project.isMember(assignedTo)){
        throw new ApiError(400, "User is not a member of this project");
    }
    
    const bug = await getBugByIdOrThrow(bugId, projectId);
    const allowedStatuses = [
        BUG_STATUS.OPEN,
        BUG_STATUS.REOPENED,
        BUG_STATUS.ASSIGNED
    ];

    if (!allowedStatuses.includes(bug.status)) {
        throw new ApiError(400, "Bug cannot be assigned in its current state");
    }

    const previousAssignee = bug.assignedTo;
    const previousStatus = bug.status;

    if (previousAssignee?.toString() === assignedTo) {
        throw new ApiError(400, "Bug is already assigned to this user");
    }

    // If status is not already ASSIGNED, update it
    if (bug.status !== BUG_STATUS.ASSIGNED) {
        bug.status = BUG_STATUS.ASSIGNED;

        bug.history.push({
            action: BUG_ACTIONS.STATUS_UPDATED,
            from: previousStatus,
            to: BUG_STATUS.ASSIGNED,
            by: req.user._id
        });
    }

    // Assignment change
    bug.assignedTo = assignedTo;

    bug.history.push({
        action: previousAssignee ? BUG_ACTIONS.BUG_REASSIGNED : BUG_ACTIONS.BUG_ASSIGNED,
        from: previousAssignee?.toString() || null,
        to: assignedTo,
        by: req.user._id,
        meta: `Assigned to user ${assignedTo}`
    });

    await bug.save();
    return res.status(200).json(
        new ApiResponse(bug, "Bug assigned successfully")
    );
})

// submit bug Fix
export const submitFix = asyncHandler( async(req, res) => {
    const {projectId, bugId} = req.params;
    const {commitUrl, summary, proof} = req.body;
    
    
    if(!summary?.trim() || !commitUrl?.trim()){
        throw new ApiError(400, "Summary and commitUrl are required")
    }
    
    const URL_REGEX = /^https?:\/\/.+\..+/;
    if (!URL_REGEX.test(commitUrl.trim())) {
        throw new ApiError(400, "commitUrl must be a valid URL (e.g., https://github.com/...)");
    }
    
    const project = await getProjectByIdOrThrow(projectId);
    
    if(!project.isMember(req.user._id)){
        throw new ApiError(403, "You are not a member of this project")
    }
    
    const bug = await getBugByIdOrThrow(bugId, projectId);
    
    const allowedStates = [
        BUG_STATUS.ASSIGNED
    ]
    
    if(!allowedStates.includes(bug.status)){
        throw new ApiError(400, "Fix cannot be submitted in current bug state")
    }

    if (!bug.assignedTo || bug.assignedTo.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not assigned to this bug");
    }

    const existingPendingFixes = await BugFix.findOne({
        bug : bug._id,
        status : "PENDING"
    })

    if(existingPendingFixes){
        throw new ApiError(400, "A fix is already pending")
    }

    let fix;
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        [fix] = await BugFix.create([{
        bug : bug._id,
        project : projectId,
        submittedBy : req.user._id,
        commitUrl : commitUrl.trim(),
        summary : summary.trim(),
        status : "PENDING",
        proof 
    }], { session });

    bug.fixes.push(fix._id);
    const previousState = bug.status;
    bug.status = BUG_STATUS.AWAITING_VERIFICATION;
    bug.history.push({
        action : BUG_ACTIONS.FIX_SUBMITTED,
        from : previousState,
        to : BUG_STATUS.AWAITING_VERIFICATION,
        by : req.user._id,
        meta : `Fix ID: ${fix._id}`
    });
    await bug.save({ session });

    await session.commitTransaction();
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
    
    return res.status(201).json(
        new ApiResponse({bug, fix}, "Fix submitted successfully")
    );
})

// request reopen
export const requestReopen = asyncHandler( async(req, res) => {

    const {projectId, bugId} = req.params;
    const {reason} = req.body;

    if(!reason?.trim()){
        throw new ApiError(400, "Reopen reason is required");
    }

    const project = await getProjectByIdOrThrow(projectId);
    if(!project.isMember(req.user._id)){
        throw new ApiError(403, "You are not a member of this project")
    }

    const bug = await getBugByIdOrThrow(bugId, projectId);

    if (bug.status !== BUG_STATUS.RESOLVED) {
        throw new ApiError(400, "Only resolved bugs can be reopened");
    }

    const previousState = bug.status;
    bug.status = BUG_STATUS.PENDING_REVIEW;

    bug.history.push({
        action : BUG_ACTIONS.REOPEN_REQUESTED,
        from : previousState,
        to : BUG_STATUS.PENDING_REVIEW,
        by : req.user._id,
        meta : reason.trim()
    })

    await bug.save();
    return res.status(200)
    .json(
        new ApiResponse(bug, "Reopen request submitted for review")
    )
})

// approve reopen request
export const approveReopen = asyncHandler( async(req, res) => {
    const {projectId, bugId} = req.params;
    const project = await getProjectByIdOrThrow(projectId);

    if(!project.isLead(req.user._id)){
        throw new ApiError(403, "Only project lead can approve reopen request")
    }

    const bug = await getBugByIdOrThrow(bugId, projectId);

    if(bug.status !== BUG_STATUS.PENDING_REVIEW){
        throw new ApiError(400, "Bug is not in pending review")
    }

    const lastHistory = bug.history[bug.history.length - 1];

    if (!lastHistory || lastHistory.action !== BUG_ACTIONS.REOPEN_REQUESTED) {
        throw new ApiError(400, "This bug is not awaiting reopen approval");
    }

    const previousState = bug.status;
    bug.status = BUG_STATUS.REOPENED;
    bug.assignedTo = null;

    bug.history.push({
        action : BUG_ACTIONS.REOPEN_APPROVED,
        from : previousState,
        to : BUG_STATUS.REOPENED,
        by : req.user._id,
        meta : "Reopened request approved"
    })

    await bug.save();

    return res.status(200).json(
        new ApiResponse(bug, "Reopen request approved successfully")
    );
})

// reject reopen request
export const rejectReopen = asyncHandler( async(req, res) => {
    const {projectId, bugId} = req.params;
    const {reason} = req.body;

    if(!reason?.trim()){
        throw new ApiError(400, "rejection reason is required")
    }

    const project = await getProjectByIdOrThrow(projectId);

    if(!project.isLead(req.user._id)){
        throw new ApiError(403, "Only project lead can reject reopen request")
    }

    const bug = await getBugByIdOrThrow(bugId, projectId);

    if(bug.status !== BUG_STATUS.PENDING_REVIEW){
        throw new ApiError(400, "Bug is not in pending review")
    }

    const lastHistory = bug.history[bug.history.length - 1];
    if (!lastHistory || lastHistory.action !== BUG_ACTIONS.REOPEN_REQUESTED) {
        throw new ApiError(400, "This bug is not awaiting reopen rejection");
    }

    const previousState = bug.status;
    bug.status = BUG_STATUS.RESOLVED;

    bug.history.push({
        action : BUG_ACTIONS.REOPEN_REJECTED,
        from : previousState,
        to : BUG_STATUS.RESOLVED,
        by : req.user._id,
        meta : reason.trim()
    })

    await bug.save();

    return res.status(200).json(
        new ApiResponse(bug, "Reopen request rejected successfully")
    );
})

// accept bugFix
export const acceptBugFix = asyncHandler( async(req, res) => {
    const { projectId, bugId, fixId } = req.params;

    const project = await getProjectByIdOrThrow(projectId);

    if(!project.isLead(req.user._id)){
        throw new ApiError(403, "Only project lead can accept bug fixes")
    }
    
    const bug = await getBugByIdOrThrow(bugId, projectId);

    if(bug.status !== BUG_STATUS.AWAITING_VERIFICATION){
        throw new ApiError(400, "Bug is not awaiting verification");
    }

    if (!mongoose.Types.ObjectId.isValid(fixId)) {
        throw new ApiError(400, "Invalid fix id format");
    }

    const fix = await BugFix.findById(fixId);

    if(!fix || fix.bug.toString() !== bug._id.toString()){
        throw new ApiError(404, "Fix not found for this bug")
    }

    if(fix.status !== "PENDING"){
        throw new ApiError(400, "Fix is not in pending state")
    };

    fix.status = "ACCEPTED";
    
    const previousState = bug.status;
    bug.status = BUG_STATUS.RESOLVED;
    
    bug.history.push({
        action : BUG_ACTIONS.BUG_RESOLVED,
        from : previousState,
        to : BUG_STATUS.RESOLVED,
        by : req.user._id,
        meta : `Fix ID ${fix._id} accepted`
    });
    
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        await fix.save({ session });
        await bug.save({ session });
        await session.commitTransaction();
    }
    catch(err){
        await session.abortTransaction();
        throw err;
    }
    finally{
        session.endSession();
    }

    return res.status(200).json(
        new ApiResponse({bug, fix}, "Fix accepted successfully")
    );
})

// reject bugFix
export const rejectBugFix = asyncHandler( async(req, res) => {
    const { projectId, bugId, fixId } = req.params;
    const {reason} = req.body;

    if(!reason?.trim()){
        throw new ApiError(400, "Rejection reason is required");
    }

    const project = await getProjectByIdOrThrow(projectId);
    if(!project.isLead(req.user._id)){
        throw new ApiError(403, "Only project lead can reject bug fixes")
    }

    const bug = await getBugByIdOrThrow(bugId, projectId);

    if(bug.status !== BUG_STATUS.AWAITING_VERIFICATION){
        throw new ApiError(400, "Bug is not awaiting verification");
    }

    if (!mongoose.Types.ObjectId.isValid(fixId)) {
        throw new ApiError(400, "Invalid fix id format");
    }

    const fix = await BugFix.findById(fixId);

    if (!fix || fix.bug.toString() !== bug._id.toString()) {
        throw new ApiError(404, "Fix not found for this bug");
    }

    if (fix.status !== "PENDING") {
        throw new ApiError(400, "Fix is not in pending state");
    }

    fix.status = "REJECTED";
    fix.rejectionReason = reason.trim();


    const previousState = bug.status;

    bug.status = BUG_STATUS.ASSIGNED;
    bug.history.push({
        action : BUG_ACTIONS.FIX_REJECTED,
        from : previousState,
        to : BUG_STATUS.ASSIGNED,
        by : req.user._id,
        meta : `Fix ID ${fix._id} rejected`
    })

    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        await fix.save({ session });
        await bug.save({ session });
        await session.commitTransaction();
    }
    catch(err){
        await session.abortTransaction();
        throw err;
    }
    finally{
        session.endSession();
    }

    return res.status(200).json(
        new ApiResponse({bug, fix}, "Fix rejected successfully")
    );
})