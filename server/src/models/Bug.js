
import { BUG_SEVERITY, BUG_STATUS, BUG_ENVIRONMENT, BUG_TYPE } from "../types/index.js"
import mongoose from "mongoose";
const { Schema } = mongoose;




const historySchema = new Schema({
    action : {
        type : String,
        required : true,
    },

    // previous state 
    from : String,

    // new state 
    to : String,

    by : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true,
    },

    createdAt : {
        type : Date,
        default : Date.now,
    },

    meta : {
        type : String
    }

}, { _id: false })

const reviewRequestSchema = new Schema({
    requestedBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    reason : {
        type : String,
        required : true,
    },
    createdAt : {
        type : Date,
        default : Date.now,
    },
}, { _id: false })


const bugSchema = new Schema(
    {
        title : {
            type : String,
            required : [true, "Bug title is required"],
            trim : true,
            minlength : [3, "Title must be at least 3 characters"],
            maxlength : [100, "Title cannot exceed 100 characters"],
        },
        description : {
            type : String,
            required : [true, "Bug description is required"],
            trim : true,
            minlength: [10, 'Description must be at least 10 characters'],
            maxlength: [5000, 'Description cannot exceed 5000 characters']
        },
        project : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Project",
            required : [true, "Project is required"],
            index : true,
        },
        createdBy : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User",
            required : [true, "Created by is required"],
            index : true,
        },
        assignedTo : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User",
            default : null,
            index : true,
        },
        severity : {
            type : String,
            enum : Object.values(BUG_SEVERITY),
            default : BUG_SEVERITY.UNCONFIRMED,
            index : true,
        },
        suggestedSeverity : {
            type : String,
            enum : Object.values(BUG_SEVERITY),
            default : null,
        },
        bugType : {
            type : String,
            enum : Object.values(BUG_TYPE),
            required : [true, "Bug type is required"],
        },
        environment : {
            type : String,
            enum : Object.values(BUG_ENVIRONMENT),
            required : [true, "Environment is required"],
        },
        status : {
            type : String,
            enum : Object.values(BUG_STATUS),
            default: BUG_STATUS.PENDING_REVIEW,
            index : true,
        },
        isActive : {
            type : Boolean,
            default : true,
            index : true,
        },
        history : [historySchema],
        fixes : [
            {
                type : mongoose.Schema.Types.ObjectId,
                ref : "BugFix",
            }
        ],
        stackTrace : {
            type : String,
        },
        moduleName : {
            type : String,
            trim : true,
        },
        reviewRequests : [reviewRequestSchema],
    },
    { 
        timestamps : true 
    }
);

export const Bug = mongoose.model("Bug", bugSchema);