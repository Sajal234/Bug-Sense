import mongoose from "mongoose"
import { ApiError } from "../utils/ApiError.js"
import { Bug } from "../models/Bug.js"

export const getBugByIdOrThrow = async(bugId, projectId) =>{

    if(!mongoose.Types.ObjectId.isValid(bugId)){
        throw new ApiError(400, "Invalid bugId format");
    }

    const filter = {
        _id : bugId,
        isActive : true
    }

    if(projectId){
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            throw new ApiError(400, "Invalid project ID format");
        }
        filter.project = projectId;
    }

    const bug = await Bug.findOne(filter);
    if(!bug){
        throw new ApiError(404, "Bug not found");
    }

    return bug;
}