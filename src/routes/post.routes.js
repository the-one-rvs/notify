// import { Post } from "../models/post.models";
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/roleCheck.middleware.js";
import { createPost, getAllPosts } from "../controllers/post.controller.js";

const router = Router();

router.route("/cerate-post").post(verifyJWT, allowRoles("admin", "member"), createPost)
router.route("/get-all-posts").get(verifyJWT, getAllPosts)
export default router