
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";

const registerUser = asyncHandler( async (req, res) => {

    // destructuring data that is sent from the client
    const { name, email, password } = req.body;


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

const generateAccessAndRefreshToken = async(user) => {
    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Error while generating access and refresh token");
    }
}

const loginUser = asyncHandler( async(req, res) => {

    // destructuring data from the req
    const { email, password } = req.body;

    // validation of each field
    if(!email || !password || email.trim()==="" || password.trim()===""){
        throw new ApiError(400, "Email and password are required");
    }

    const normalizedEmail = email.toLowerCase();

    // find user by using email
    const user = await User.findOne({email: normalizedEmail}).select("+passwordHash");
    if(!user){
        throw new ApiError(401, "Invalid email or password");
    }

    // check password
    const isPasswordValid = await user.comparePassword(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid email or password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);
    const loggedInuser = await User.findById(user._id)
    .select("-passwordHash -refreshToken");

    const options = {
        httpOnly : true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }

    return res.status(200)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            {
                user: loggedInuser,
                accessToken
            },
            "User logged in successfully"
        )
    )

});

const logoutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {
                refreshToken: undefined
            },
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly : true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
    return res.status(200)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            {},
            "User logged out successfully"
        )
    );
})

const refreshAccessToken = asyncHandler( async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken.userId).select("+refreshToken");

        if(!user){
            throw new ApiError(401, "Invalid refresh token");
        }

        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly : true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user);
        
        return res.status(200)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                {
                    accessToken,
                },
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
})

export { registerUser, loginUser, logoutUser, refreshAccessToken };