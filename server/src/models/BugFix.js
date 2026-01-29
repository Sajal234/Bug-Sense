
import mongoose from "mongoose";
const { Schema } = mongoose;

const bugFixSchema = new Schema(
    {
        bug : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Bug",
            required : [true, "Bug reference is required"],
            index : true
        },
        submittedBy : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User",
            required : [true, "Developer is required"],
            index : true
        },
        commitUrl : {
            type : String,
            required : [true, "commitUrl is required"],
            trim : true,
            match: [
                /^https?:\/\/.+\..+/,
                "Must be a valid URL (e.g., https://github.com/...)"
            ]
        },
        summary : {
            type : String,
            required : [true, "Bug fix summary is required"],
            trim : true,
            minlength : [10, "Fix summary must be at least 10 characters"],
            maxlength : [1000, "Fix summary cannot exceed 1000 characters"]
        },
        proof : {
            type : String,
            trim : true
        },
        status : {
            type : String,
            enum: ["PENDING", "ACCEPTED", "REJECTED"],
            default : "PENDING",
            index : true
        },
        rejectionReason : {
            type : String,
            trim : true,
            maxlength : 1000
        }
    },
    { 
        timestamps : true 
    }
);

bugFixSchema.index({ bug: 1, status: 1 });

export const BugFix = mongoose.model("BugFix", bugFixSchema);