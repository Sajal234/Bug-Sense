
import mongoose from "mongoose";
const { Schema } = mongoose;


const commentSchema = new Schema(
    {
        bug : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'Bug',
            required : [true, "Bug reference is required"],
            index : true
        },
        createdBy : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User",
            required : [true, "Author is required"],
            index : true
        },
        text : {
            type : String,
            required : [true, "Comment content is required"],
            trim : true,
            minlength : [1, "Comment must be at least 1 character"],
            maxlength : [1000, "Comment cannot exceed 1000 characters"]
        },
        isDeleted : {
            type : Boolean,
            default : false,
            index : true
        }
    }, 
    { 
        timestamps : true 
    }

);

commentSchema.index({ bug: 1, createdAt: 1 });

export const Comment = mongoose.model("Comment", commentSchema);