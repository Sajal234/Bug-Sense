
import mongoose from "mongoose";
const { Schema } = mongoose;

const projectSchema = new Schema(
    {
        name : {
            type : String,
            required : [true, "Project name is required"],
            trim : true,
            minlength :[2, "Project name must be at least 2 characters"],
            maxlength : [100, "Project name cannot exceed 100 characters"],
        },
        description : {
            type : String,
            trim : true,
            maxlength : [500, "Project description cannot exceed 500 characters"],
        },
        lead : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User",
            required : [true, "Project lead is required"],
            index : true,
        },
        members : [
            {
                user : {
                    type : mongoose.Schema.Types.ObjectId,
                    ref : "User",
                    required : [true, "User is required"],
                    index : true,
                },
                role : {
                    type : String,
                    enum : ["FULLSTACK", "FRONTEND", "BACKEND", "QA", "DESIGNER", "OTHER"],
                    default : "FULLSTACK",
                }
            }
        ],
        inviteCode: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index : true,
        },
    },
    { 
        timestamps : true 
    }
);

// for member count
projectSchema.methods.getMemberCount = function(){
    return this.members.length;
}

// check if user is a member
projectSchema.methods.isMember = function(userId){
    return this.members.some(
        (member) => member.user.toString() === userId.toString()
    );
}

// check if user is a lead
projectSchema.methods.isLead = function(userId){
    return this.lead.toString() === userId.toString();
}


export const Project = mongoose.model("Project", projectSchema);