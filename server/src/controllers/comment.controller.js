import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getProjectByIdOrThrow } from "../services/project.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getBugByIdOrThrow } from "../services/bug.js";
import { Comment } from "../models/Comment.js";


// add comment 
export const addComment = asyncHandler( async(req, res) => {
    const {projectId, bugId} = req.params;
    const { text } = req.body;

    if(!text?.trim()){
        throw new ApiError(400, "Comment text is required")
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