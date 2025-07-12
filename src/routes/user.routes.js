import { Router } from "express";
import { getAllUsernames, registerUser, updateUserRole } from "../controllers/user.controller.js";
import { allowRoles } from "../middleware/roleCheck.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();


//secure routes


//role based routes
router.route("/register").post(verifyJWT,allowRoles("admin"),registerUser)
router.route("/all-usernames").get(verifyJWT,allowRoles("admin"),getAllUsernames)
router.route("/update-user-role").post(verifyJWT,allowRoles("admin"),updateUserRole)

export default router