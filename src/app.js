import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
// import session from "express-session"; 
import passport from "./middleware/passport.middleware.js";

const app = express()

import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'

const swaggerDocument = YAML.load('./docs/swagger.yaml')
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

import { prometheusMiddleware } from "./middleware/httpmetrics.middleware.js";
app.use(prometheusMiddleware);

// Expose metrics route
import { register } from "./metrics.js";
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credential: true
}))

// app.use(session({
//     secret: process.env.SESSION_SECRET || "notify_secret",
//     resave: false,
//     saveUninitialized: false
// }));
app.use(passport.initialize());
// app.use(passport.session());

app.use(express.json({limit: "20kb"}))
app.use(express.urlencoded({extended: true, limit: "20kb" }))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from './routes/user.routes.js'
app.use("/api/v1/users", userRouter)

import authRouter from './routes/auth.routes.js'
app.use("/api/v1/auth", authRouter)

import postRouter from './routes/post.routes.js'
app.use("/api/v1/post", postRouter)

export { app }