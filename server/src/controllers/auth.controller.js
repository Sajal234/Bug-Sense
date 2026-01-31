
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req, res) => {

    // destructuring data that is sent from the client
    const { name, email, password } = req.body;
    console.log("Name : ", name);
    console.log(`Email : ${email}`);

    // validation of each field
    if([name, email, password].some((field) => !field || field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    const normalizedEmail = email.toLowerCase();

    // check if user already exists
    const existingUser = await User.findOne({email : normalizedEmail})
    if(existingUser){
        throw new ApiError(409, "Email already exists");
    }

    
    // create new user
    const user = await User.create({
        name,
        email : normalizedEmail,
        passwordHash : password
    });

    if(!user){
        throw new ApiError(500, "User registration failed");
    }

    // removing important data from response
    const createdUser = await User.findById(user._id).select(
        "-passwordHash -refreshToken"
    )


    // return reponse
    return res.status(201).json(
        new ApiResponse(createdUser, "User registered successfully")
    )
});

export { registerUser };