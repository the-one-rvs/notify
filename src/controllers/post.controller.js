import { Post } from "../models/post.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create a new post
const createPost = asyncHandler(async (req, res) => {
    try {
        const { postTitle, postContent, postMedia } = req.body;
        if (!postTitle || !postContent) {
            throw new ApiError(400, "Post title and content are required");
        }
        const post = await Post.create({
            postTitle,
            postContent,
            postMedia,
            owner: req.user._id
        });
        return res.status(201).json(new ApiResponse(201, post, "Post created successfully"));
    } catch (error) {
        throw new ApiError(400, error?.message || "Error in creating Post")
    }
});

// Get all posts
const getAllPosts = asyncHandler(async (req, res) => {
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
                owner: "$ownerInfo.username"
            }
        }
    ]);
    return res.status(200).json(new ApiResponse(200, posts, "Posts fetched successfully"));
});

// Get a single post by ID
const getPostByPostNumberAndOwner = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const post = await Post.findById(id).populate("owner", "username email");
    if (!post) {
        throw new ApiError(404, "Post not found");
    }
    return res.status(200).json(new ApiResponse(200, post, "Post fetched successfully"));
});

// Update a post
const updatePost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { postTitle, postContent, postMedia } = req.body;
    const post = await Post.findById(id);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }
    if (String(post.owner) !== String(req.user._id)) {
        throw new ApiError(403, "You are not allowed to update this post");
    }
    post.postTitle = postTitle || post.postTitle;
    post.postContent = postContent || post.postContent;
    post.postMedia = postMedia || post.postMedia;
    await post.save({ValidityState: false});
    return res.status(200).json(new ApiResponse(200, post, "Post updated successfully"));
});

// Delete a post
const deletePost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }
    if (String(post.owner) !== String(req.user._id)) {
        throw new ApiError(403, "You are not allowed to delete this post");
    }
    await post.deleteOne();
    return res.status(200).json(new ApiResponse(200, {}, "Post deleted successfully"));
});

export {
    createPost,
    getAllPosts,
    getPostByPostNumberAndOwner,
    updatePost,
    deletePost
}