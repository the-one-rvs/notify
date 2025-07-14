import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/user.models.js";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // 1. Try to find user by googleid
        let user = await User.findOne({ googleid: profile.id });

        // 2. If not found, try to find by email
        if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
                // If found by email, update googleid if not already set
                if (!user.googleid) {
                    user.googleid = profile.id;
                    await user.save();
                }
            }
        }

        // 3. If still not found, create new user
        if (!user) {
            user = await User.create({
                username: profile.emails[0].value.split("@")[0],
                email: profile.emails[0].value,
                fullname: profile.displayName,
                googleid: profile.id,
                role: "member"
            });
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

export default passport;