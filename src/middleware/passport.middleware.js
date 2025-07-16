import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { oauthcallback, oauthduration } from "../metrics.js";


// Google OAuth Strategy
const op1 = oauthduration.startTimer({OperationType: "Looging In"})
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleid: profile.id });

        if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });
            if (user && !user.googleid) {
                user.googleid = profile.id;
                await user.save();
            }
        }

        if (!user) {
            // user = await User.create({
            //     username: profile.emails[0].value.split("@")[0],
            //     email: profile.emails[0].value,
            //     fullname: profile.displayName,
            //     googleid: profile.id,
            //     password: "dummy", // won't be used, just satisfies schema
            //     role: "member"
            // });
            throw new ApiError (400, " User Not Created Before By Admin")
        }

        if (!user) {
            return done(null, false);  // this will prevent `req.user` from being set
        }
        oauthcallback.inc()
        op1()
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// // ✅ Serialize user into session
// passport.serializeUser((user, done) => {
//     done(null, user._id); // storing only MongoDB _id
// });

// // ✅ Deserialize user from session
// passport.deserializeUser(async (id, done) => {
//     try {
//         const user = await User.findById(id);
//         done(null, user); // user will be available as req.user
//     } catch (err) {
//         done(err, null);
//     }
// });

export default passport;
