import { Router } from "express";
import { 
    changeCurrentPassword,
    currentUser,
    loginUser,
    logoutUser,
    refreshUserAccessToken,
    registerUser,
    seedAdmin,
    updateCurrentAccountDetails } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import passport from "../middleware/passport.middleware.js";


const router = Router()

//OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
        // Successful authentication
        res.json({ user: req.user, message: "Google OAuth successful" });
    }
);

router.route("/seed-admin").post(seedAdmin)
router.route("/login").post(loginUser)
router.route("/logout").get(logoutUser)

//secured routes
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/update-account-details").patch(verifyJWT, updateCurrentAccountDetails)
router.route("/current-user").get(verifyJWT, currentUser)
router.route("/refresh-tokens").post(verifyJWT,refreshUserAccessToken)

// router.route("/").post(changeCurrentPassword)

export default router