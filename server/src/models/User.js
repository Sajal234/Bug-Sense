import jwt from "jsonwebtoken";
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
        }
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
        return ;

    // passwordHash may temporarily hold a plain password before save.
    // This guard prevents re-hashing already hashed bcrypt passwords.
    if (this.passwordHash.startsWith("$2")) 
        return ;
    

    this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
});

// check if password is correct
userSchema.methods.comparePassword = async function(candidatePassword){
    return await bcrypt.compare(candidatePassword, this.passwordHash);
} 

// generate access token
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            userId : this._id,
            email : this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY || "15m"
        }
    )
}

// generate refresh token
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            userId : this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY || "7d"
        }
    )
}



export const User = mongoose.model("User", userSchema);