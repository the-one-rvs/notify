import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import redis from "../utils/redisClient.js";
import { activeSessionGauge, 
    adminSeeded, 
    jwtFailureCounter, 
    loginSuccessCounter, 
    refreshUserTokenMetrics, 
    roleUpdateMetrics, 
    updateDetailsMetrics, 
    loginDurationSummary,
    mongoQueryDuration } from "../metrics.js";


const generateAccessAndRefereshTokens = async (userID) => {
    try {
        //Find user from userID 
        const timer2 = mongoQueryDuration.startTimer({ operation: "findById", collection: "users", function: "generateAccessAndRefereshTokens" });
        const user = await User.findById(userID)
        timer2()
        if (!user){
            throw new ApiError(400, "User not found while creating the tokens")
        }

        // creating the access and refresh tokens 
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        if (!accessToken || !refreshToken){
            jwtFailureCounter.inc()
            throw new ApiError(400, "Something is Fishy Can't get required tokens")
        }

        // saving refresh token in db 
        user.refreshToken = refreshToken
        const timer = mongoQueryDuration.startTimer({ operation: "save", collection: "users", function: "generateAccessAndRefereshTokens" });
        await user.save({validateBeforeSave: false})
        timer()
        // returning access and refresh tokens 
        return {accessToken, refreshToken}

    } catch (error) {
        jwtFailureCounter.inc()
        throw new ApiError (400, error?.message || "Error while creating access and refresh tokens")
    }
}

const seedAdmin = asyncHandler(async(req,res)=>{
    //Get the data 
    const {fullname, username, email, password, role} = req.body
    await redis.del("allUsernames"); 
    if (role !== "admin") {
        throw new ApiError(403, "Only admin role can be seeded");
    }
    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    const op1 = mongoQueryDuration.startTimer({ operation: "findOne", collection: "users", function: "seedAdmin" });
    const existeduser = await User.findOne({
        $or: [{ username }, { email }]
    })
    op1()
    if (existeduser){
        throw new ApiError(400, "User Already Exsists")
    }
    // Admin User Saved in Database 
    const op2 = mongoQueryDuration.startTimer({ operation: "create", collection: "users", function: "seedAdmin"});
    const user = await User.create({
        fullname,
        email, 
        password,
        username: username.toLowerCase(),
        role
    })
    op2()
    const op3 = mongoQueryDuration.startTimer({ operation: "findById", collection: "users", function: "seedAdmin"});
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    op3()

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    adminSeeded.inc()
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const registerUser = asyncHandler(async (req, res)=>{
    //user data from frontend 
    const {fullname, username, email, password, role} = req.body
    await redis.del("allUsernames"); 
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
    const end = loginDurationSummary.startTimer({ route: "/login" });
    if (!username && !email){
        throw new ApiError(400, "username or email required")
    }
    const op1 = mongoQueryDuration.startTimer({ operation: "findOne", collection: "users", function: "loginUser"});
    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    op1()

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
    if (!loggedInUser){
        throw new ApiError(400, "Something Fishy! Can't get loogedin user info")
    }

    const options = {
        httpOnly: true,
        secure: true
    }
    await redis.set(`user:${loggedInUser._id}:profile`, JSON.stringify(loggedInUser), "EX", 3600);
    loginSuccessCounter.inc()
    activeSessionGauge.inc()
    end()
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
    await redis.del(`user:${user._id}:profile`);
    activeSessionGauge.dec()
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
})

const currentUser = asyncHandler(async(req, res) => {
    const user = req.user
    const redisKey = `user:${user._id}:profile`;
    const cachedUser = await redis.get(redisKey);
    if (cachedUser) {
        return res.status(200).json(new ApiResponse(200, JSON.parse(cachedUser), "User from cache"));
    }
    const checkUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!checkUser){
        throw new ApiError(400, "User is not found in DB")
    }
    await redis.set(redisKey, JSON.stringify(checkUser), "EX", 3600);

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
        refreshUserTokenMetrics.inc()
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
    roleUpdateMetrics.inc()
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
    await redis.del(`user:${user._id}:profile`);
    await redis.del("allUsernames"); 

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
    updateDetailsMetrics.inc()
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
        const cached = await redis.get("allUsernames");
        if (cached) return res.status(200).json(new ApiResponse(200, JSON.parse(cached), "Usernames from cache"));
        const users = await User.find({}, "username");
        const usernames = users.map(user => user.username);
        await redis.set("allUsernames", JSON.stringify(usernames), "EX", 3600)
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