// import { Post } from "../models/post.models";
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/roleCheck.middleware.js";
import { 
    createPost, 
    deletePostByPostNumberAndOwnerName, 
    getAllPosts,  
    getPostByPostNumberAndOwnerName, 
    getPostsByOwnerName,
    updatePost} from "../controllers/post.controller.js";

const router = Router();

router.route("/cerate-post").post(verifyJWT, allowRoles("admin", "member"), createPost)
router.route("/get-all-posts").get(verifyJWT, getAllPosts)
router.route("/getpost/:username/:postNumber").get(verifyJWT, getPostByPostNumberAndOwnerName)
router.route("/getpost/:username").get(verifyJWT, getPostsByOwnerName)
router.route("/deletepost/:username/:postNumber").delete(verifyJWT, allowRoles("admin", "member"), deletePostByPostNumberAndOwnerName)
router.route("/updatepost/:username/:postNumber").patch(verifyJWT, allowRoles("admin", "member"), updatePost)


export default router