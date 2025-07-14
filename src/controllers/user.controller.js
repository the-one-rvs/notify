import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefereshTokens = async (userID) => {
    try {
        //Find user from userID 
        const user = await User.findById(userID)

        if (!user){
            throw new ApiError(400, "User not found while creating the tokens")
        }

        // creating the access and refresh tokens 
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        // saving refresh token in db 
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        // returning access and refresh tokens 
        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError (400, error?.message || "Error while creating access and refresh tokens")
    }
}

const seedAdmin = asyncHandler(async(req,res)=>{
    //Get the data 
    const {fullname, username, email, password, role} = req.body
    if (role !== "admin") {
        throw new ApiError(403, "Only admin role can be seeded");
    }
    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    const existeduser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existeduser){
        throw new ApiError(400, "User Already Exsists")
    }
    // Admin User Saved in Database 
    const user = await User.create({
        fullname,
        email, 
        password,
        username: username.toLowerCase(),
        role
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const registerUser = asyncHandler(async (req, res)=>{
    //user data from frontend 
    const {fullname, username, email, password, role} = req.body

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    // check if role is given 
    if (!role){
        role = "guest"
    }

    // check whether a user exited 

    const existeduser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existeduser){
        throw new ApiError(400, "User Already Exsists")
    }
    // User Saved in Database 
    const user = await User.create({
        fullname,
        email, 
        password,
        username: username.toLowerCase(),
        role
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const loginUser = asyncHandler (async (req,res)=>{
    //Check if data is given properly or not 
    const {email, username, password} = req.body

    if (!username && !email){
        throw new ApiError(400, "username or email required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user){
        throw new ApiError(400, "User not found")
    }

    //user found
    const checkPassword = await user.isPasswordCorrect(password)

    if (!checkPassword){
        throw new ApiError(400, "Password did'nt Match")
    }
    
    // creating that Access and Refresh Tokens
    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async (req,res) => {
    const user = req.user
    // removing the refreshToken
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });

    const options = {
        httpOnly: true,
        secure: true
    };
    // returning response that user looged out successfully 
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
})

const currentUser = asyncHandler(async(req, res) => {
    const user = req.user
    const checkUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!checkUser){
        throw new ApiError(400, "User is not found in DB")
    }
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "User Fetched Successfully"
    ))
})

const refreshUserTokens = asyncHandler(async (req,res) => {
    // Get access token from cookies or body
    try{
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        //refresh token not found 
        if (!incomingRefreshToken){
            throw new ApiError(401, "Unauth Request")
        }
        // verify the refresh token
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id)
    
        if (!user){
            throw new ApiError(401, "Invalid refresh token")
        }
        // check with db refresh token
        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken" , accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message|| "Invalid Refresh Token")
    }
    
})

const updateUserRole = asyncHandler(async(req,res) => {
    const {email, username, role} = req.body
    if (!username && !email){
        throw new ApiError(400, "username or email required")
    }
    if (!role){
        throw new ApiError(400, "Role is required")
    }
    const user = User.findOne({
        $or:[{username}, {email}]
    })

    if (!user){
        throw new ApiError(400, "User not found")
    }

    //user found
    const previousRole = user.role
    if (role === previousRole){
        throw new ApiError(400, "Both Roles are Same")
    }

    user.role = role
    user.save({validateBeforeSave: false}) 

    res
    .status(200)
    .json(new ApiResponse(200, {
        role,
        email
    },
    "Role Changed"
    ))
})

const updateCurrentAccountDetails = asyncHandler(async (req,res) => {
    const {fullname, username, email} = req.body

    if (!fullname || !email || !username) {
        throw new ApiError(404, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{ 
                fullname: fullname,
                email: email,
                username: username
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json ( new ApiResponse(200, user, "Account Details Updated"))
})

const changeCurrentPassword = asyncHandler(async(req,res)=> {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPassCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPassCorrect){
        throw new ApiError(400, "Invalid Password")
    }

    user.password = newPassword
    user.save({validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(200,{},"Password Changed"))
})

const getAllUsernames = asyncHandler(async (req, res) => {
    try {
        const users = await User.find({}, "username");
        const usernames = users.map(user => user.username);
        return res.status(200).json(new ApiResponse(200, usernames, "Usernames fetched successfully"));
    
    } catch (error) {
        throw new ApiError(400, error?.message)
    }
});


export {
    seedAdmin,
    registerUser,
    loginUser,
    logoutUser,
    refreshUserTokens,
    updateUserRole,
    updateCurrentAccountDetails,
    changeCurrentPassword,
    getAllUsernames,
    currentUser
}