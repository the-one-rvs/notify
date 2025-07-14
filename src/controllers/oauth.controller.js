import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";

export const generateAccessToken = (user) => {
    return jwt.sign(
        {   _id: user._id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            role: user.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

export const generateRefreshToken = (user) => {
    return jwt.sign(
        { _id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

const tokens = asyncHandler( async (req, res) => {
    const user = req.user;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const options = {
        httpOnly: true,
        secure: true
    };
    // Optional: Store refreshToken in DB
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false});
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    // Send both in secure cookies
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse( 200, 
    {
        loggedInUser,
        refreshToken,
        accessToken
    },
     "Login successful" ));
})

export {tokens}