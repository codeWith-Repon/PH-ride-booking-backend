import express, { Request, Response } from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import notFound from "./app/middlewares/notFound"
import { router } from "./app/routes"
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler"
import expressSession from "express-session"
import passport from "passport"
import "./app/config/passport"
import { envVars } from "./app/config/env"
import { globalLimiter } from "./app/config/rateLimit.config"

const app = express()

app.use(expressSession({
    secret: "Your secret",
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin: [envVars.FRONTEND_URL, "http://localhost:3000"],
    credentials: true
}))

app.use(globalLimiter)
app.use("/api/v1", router)

app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        message: "Welcome to Ride Booking system backend!!!"
    })
})

app.use(globalErrorHandler)

app.use(notFound)

export default app