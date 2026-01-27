
import mongoose from "mongoose";
const { Schema } = mongoose;

import bcrypt from "bcryptjs";



const userSchema = new Schema(
    {
        name : {
            type : String,
            required : [true, "Name is required"],
            trim : true,
            minlength : [3, "Name must be at least 3 characters"],
            maxlength : [50, "Name cannot exceed 50 characters"],
        }, 
        email : {
            type : String,
            required : [true, "Email is required"],
            unique : true,
            lowercase : true,
            trim : true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
            index : true,
        },
        passwordHash : {
            type : String,
            required : [true, "Password is required"],
            select : false,
        },
    }, 
    {
        timestamps : true,
    }
);


// hash password before saving 
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;
userSchema.pre("save", async function(next){

    // password not modified
    if(!this.isModified("passwordHash"))
        return next();


    this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
    next();
});

// check if password is correct
userSchema.methods.comparePassword = async function(candidatePassword){
    return await bcrypt.compare(candidatePassword, this.passwordHash);
} 



export const User = mongoose.model("User", userSchema);