import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getProjectByIdOrThrow } from "../services/project.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getBugByIdOrThrow } from "../services/bug.js";
import { Comment } from "../models/Comment.js";
import mongoose from "mongoose";


// add comment 
export const addComment = asyncHandler( async(req, res) => {
    const {projectId, bugId} = req.params;
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim() === "") {
        throw new ApiError(400, "Comment text is required");
    }

    const project = await getProjectByIdOrThrow(projectId);

    if(!project.isMember(req.user._id)){
        throw new ApiError(403, "You are not a member of this project")
    }

    const bug = await getBugByIdOrThrow(bugId, projectId);

    if(!bug.isActive){
        throw new ApiError(400, "Cannot comment on inactive bug");
    }

    const comment = await Comment.create({
        text : text.trim(),
        bug : bug._id,
        project : project._id,
        createdBy : req.user._id
    });

    await comment.populate("createdBy", "name email");

    return res.status(201).json(
        new ApiResponse(comment, "Comment added successfully")
    )
});

// get bug comments
export const getBugComments = asyncHandler( async(req, res) => {
    const { projectId, bugId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const project = await getProjectByIdOrThrow(projectId);

    if(!project.isMember(req.user._id)){
        throw new ApiError(403, "You are not a member of this project")
    }

    const bug = await getBugByIdOrThrow(bugId, projectId);

    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const limitNumber = Math.max(Math.min(parseInt(limit) || 10, 50), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {
        bug : bug._id,
        project : project._id,
        isDeleted : false
    }

    const comments = await Comment.find(filter)
    .sort({createdAt : 1})
    .skip(skip)
    .limit(limitNumber)
    .populate("createdBy", "name email");

    const total = await Comment.countDocuments(filter);

    return res.status(200).json(
        new ApiResponse(
            {
                comments,
                pagination: {
                    total,
                    page: pageNumber,
                    limit: limitNumber,
                    pages: Math.ceil(total / limitNumber)
                }
            },
            "Comments fetched successfully"
        )
    );
})

// edit comment
export const editComment = asyncHandler( async(req, res) => {
    const { commentId, projectId, bugId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim() === "") {
        throw new ApiError(400, "Updated comment text is required");
    }

    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }
    const comment = await Comment.findById(commentId);

    if(!comment || comment.isDeleted){
        throw new ApiError(404, "Comment not found")
    }

    const project = await getProjectByIdOrThrow(projectId);

    if(comment.project.toString() !== project._id.toString()){
        throw new ApiError(400, "Comment does not belong to this project");
    }

    if(!project.isMember(req.user._id)){
        throw new ApiError(403, "You are not a member of this project")
    }

    const bug = await getBugByIdOrThrow(bugId, projectId);

    if (comment.bug.toString() !== bug._id.toString()) {
        throw new ApiError(400, "Comment does not belong to this bug");
    }

    if(comment.createdBy.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You can only edit your own comment")
    }

    comment.text = text.trim();
    await comment.save();

    await comment.populate("createdBy", "name email");

    return res.status(200).json(
        new ApiResponse(comment, "Comment updated successfully")
    )
})

// delete comment
export const deleteComment = asyncHandler( async(req, res) => {
    const { projectId, bugId, commentId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findById(commentId);

    if(!comment || comment.isDeleted){
        throw new ApiError(404, "Comment not found");
    }

    const project = await getProjectByIdOrThrow(projectId);

    if(comment.project.toString() !== project._id.toString()){
        throw new ApiError(400, "Comment does not belong to this project");
    }

    if(!project.isMember(req.user._id)){
        throw new ApiError(403, "You are not a member of this project")
    }

    const bug = await getBugByIdOrThrow(bugId, projectId);

    if (comment.bug.toString() !== bug._id.toString()) {
        throw new ApiError(400, "Comment does not belong to this bug");
    }

    const isAuthor = comment.createdBy.toString() === req.user._id.toString();
    const isLead = project.isLead(req.user._id);

    if(!isAuthor && !isLead){
        throw new ApiError(403, "Not authorized to delete this comment");
    }
    
    comment.isDeleted = true;
    comment.text = "[comment deleted]";

    await comment.populate("createdBy", "name email");
    await comment.save();

    return res.status(200).json(
        new ApiResponse(comment, "Comment deleted successfully")
    )
})