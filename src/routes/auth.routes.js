import { Router } from "express";
import { 
    changeCurrentPassword,
    currentUser,
    loginUser,
    logoutUser,
    refreshUserTokens,
    seedAdmin,
    updateCurrentAccountDetails } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import passport from "../middleware/passport.middleware.js";
import { tokens } from "../controllers/oauth.controller.js";


const router = Router()

//OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get('/google/callback',
    passport.authenticate('google', { session: false }),tokens );

router.route("/seed-admin").post(seedAdmin)
router.route("/login").post(loginUser)
router.route("/logout").get(verifyJWT, logoutUser)

//secured routes
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/update-account-details").patch(verifyJWT, updateCurrentAccountDetails)
router.route("/current-user").get(verifyJWT, currentUser)
router.route("/refresh-tokens").post(verifyJWT,refreshUserTokens)

// router.route("/").post(changeCurrentPassword)

export default router