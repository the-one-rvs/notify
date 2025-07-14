import { Post } from "../models/post.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import redis from "../utils/redisClient.js";

// Create a new post
const createPost = asyncHandler(async (req, res) => {
    try {       
        await redis.del(`allPosts`)
        const { postTitle, postContent} = req.body;
        if (!postTitle || !postContent) {
            throw new ApiError(400, "Post title and content are required");
        }
        const postMediaLocalPath = req.file?.path

        if (!postMediaLocalPath) {
            throw new ApiError(400, "Avatar missing")
        }

        const postMedia = await uploadOnCloudinary(postMediaLocalPath)

        if (!postMedia.url) {
            throw new ApiError(400, "Something is messy Can't find avatar url")
        }
        const post = await Post.create({
            postTitle,
            postContent,
            postMedia: postMedia.url,
            owner: req.user._id
        });
        console.log("Post created successfully")
        return res.status(201).json(new ApiResponse(201, post, "Post created successfully"));
    } catch (error) {
        throw new ApiError(400, error?.message || "Error in creating Post")
    }
});

// Get all posts
const getAllPosts = asyncHandler(async (req, res) => {
    const redisKey = "allPosts";
    const cachedPost = await redis.get(redisKey);
    if (cachedPost){
        return res.status(200)
        .json(new ApiResponse(200, JSON.parse(cachedPost), "Showing All Posts from Cache"))
    }
    const posts = await Post.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerInfo"
            }
        },
        {
            $unwind: "$ownerInfo"
        },
        {
            $project: {
                postTitle: 1,
                postContent: 1,
                postMedia: 1,
                createdAt: 1,
                updatedAt: 1,
                postNumber: 1,
                owner: "$ownerInfo.username"
            }
        }
    ]);
    console.log("Posts fetched successfully")
    await redis.set(redisKey, JSON.stringify(posts), "EX", 3600)
    return res.status(200).json(new ApiResponse(200, posts, "Posts fetched successfully"));
});

const getPostByPostNumberAndOwnerName = asyncHandler(async (req, res) => {
    const { username, postNumber  } = req.params;
    const redisKey = `post:${username}:${postNumber}`;

    const cachedPosts = await redis.get(redisKey);
    if (cachedPosts) {
        return res.status(200).json(new ApiResponse(
            200,
            JSON.parse(cachedPosts),
            "Post cached from redis"
        ));
    }

    const user = await User.findOne({ username: username })
    if (!user){
        throw new ApiError(400, "No User is there with the given Username" )
    }
    const post = await Post.findOne({
        postNumber: postNumber,
        owner: user._id
    })

    await redis.set(redisKey, JSON.stringify(post), "EX", 3600); 

    if (!post) {
        throw new ApiError(404, "No post found for this user with the given post number");
    }
    console.log("The Post is Fetched")
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        post,
        "The Post is Fetched"
    ))
});


const getPostsByOwnerName = asyncHandler(async (req,res) =>{
    const { username } = req.params;
    const redisKey = `usernamePosts:${ username }`;
    const cachedPosts = redis.get(redisKey);
    if (cachedPosts){
        return res.status(200)
        .json(new ApiResponse(200, JSON.parse(cachedPosts), "`ALL Posts fetched for username ${username} through Cache`"))
    }
    const user = await User.findOne({ username: username })
    if (!user){
        throw new ApiError(400, "No User is there with the given Username" )
    }
    const posts = await Post.find({ owner: user._id });
    const resPosts = await Post.aggregate([{
        $match: { owner: user._id }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerInfo"
            }
        },
        {
            $unwind: "$ownerInfo"
        },
        {
            $project: {
                postTitle: 1,
                postContent: 1,
                postMedia: 1,
                createdAt: 1,
                updatedAt: 1,
                postNumber: 1,
                owner: "$ownerInfo.username",
                ownerFullName: "$ownerInfo.fullname"
            }
    }])
    console.log(`ALL Posts fetched for username ${username}.`)
    await redis.set(redisKey, JSON.stringify(resPosts), "EX", 3600);
    return res.status(200)
    .json(new ApiResponse(
        200,
        resPosts,
        `ALL Posts fetched for username ${username}.`
    ))
})

const deletePostByPostNumberAndOwnerName = asyncHandler(async (req, res) => {
    const { username, postNumber  } = req.params;
    const user = await User.findOne({ username: username })
    if (!user){
        throw new ApiError(400, "No User is there with the given Username" )
    }
    const post = await Post.findOne({
        postNumber: postNumber,
        owner: user._id
    })
    if (!post) {
        throw new ApiError(404, "No post found for this user with the given post number");
    }
    if (user.role === "admin" || req.user.username === username){
        await post.deleteOne();

        // Adjust postNumbers for remaining posts
        await Post.updateMany(
            {
                owner: user._id,
                postNumber: { $gt: Number(postNumber) }
            },
            { $inc: { postNumber: -1 } }
        );
    }
    else {
        throw new ApiError(400, "Your Role Didn't Match the desired one")
    }
    console.log("The Post is Deleted")
    await redis.del(`post:${username}:${postNumber}`)
    await redis.del(`allPosts`)
    await redis.del(`usernamePosts:${ username }`)
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        "The Post is Deleted"
    ))
});

// Update a post
const updatePost = asyncHandler(async (req, res) => {
    const { username, postNumber  } = req.params;
    const user = await User.findOne({ username: username })
    if (!user){
        throw new ApiError(400, "No User is there with the given Username" )
    }
    const post = await Post.findOne({
        postNumber: postNumber,
        owner: user._id
    })
    if (!post) {
        throw new ApiError(404, "No post found for this user with the given post number");
    }
    const { postTitle, postContent, postMedia } = req.body;
    if (user.role === "admin" || req.user.username === username){
        post.postTitle = postTitle || post.postTitle;
        post.postContent = postContent || post.postContent;
        post.postMedia = postMedia || post.postMedia;
        await post.save({ValidityState: false});
    }
    await redis.del(`post:${username}:${postNumber}`)
    await redis.del(`allPosts`)
    await redis.del(`usernamePosts:${ username }`)
    return res.status(200).json(new ApiResponse(200, post, "Post updated successfully"));
});


export {
    createPost,
    getAllPosts,
    getPostByPostNumberAndOwnerName,
    updatePost,
    deletePostByPostNumberAndOwnerName,
    getPostsByOwnerName,
}