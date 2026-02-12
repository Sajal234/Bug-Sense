import { Project } from "../models/Project.js";
import { ApiError } from "../utils/ApiError.js";


// get project by id or throw error
export const getProjectByIdOrThrow = async(projectId) =>{
    const project = await Project.findById(projectId);

    if(!project){
        throw new ApiError(404, "Project not found");
    }

    return project;
}

