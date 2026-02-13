import { Project } from "../models/Project.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";


// get project by id or throw error
export const getProjectByIdOrThrow = async(projectId) =>{

    if(!mongoose.Types.ObjectId.isValid(projectId)){
        throw new ApiError(400, "Invalid project ID");
    }
    
    const project = await Project.findById(projectId);

    if(!project){
        throw new ApiError(404, "Project not found");
    }

    return project;
}

