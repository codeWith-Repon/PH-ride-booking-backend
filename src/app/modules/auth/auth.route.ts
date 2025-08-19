import { NextFunction, Request, Response, Router } from "express";
import { AuthController } from "./auth.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import passport from "passport";

const router = Router()


router.post("/login", AuthController.credentialsLogin)
router.post("/refresh-token", AuthController.getNewAccessToken)
router.post("/logout", AuthController.logOut)
router.post("/set-password", checkAuth(...Object.values(Role)), AuthController.setPassword)
router.post("/change-password", checkAuth(...Object.values(Role)), AuthController.changePassword)
router.post("/forgot-password", AuthController.forgetPassword)
router.post("/reset-password", checkAuth(...Object.values(Role)), AuthController.resetPassword)
router.get("/google", async (req: Request, res: Response, next: NextFunction) => {
    const redirect = req.query.redirect || "/"
    passport.authenticate("google", { scope: ["profile", "email"], state: redirect as string })(req, res, next)
})
// http://localhost:5000/api/v1/auth/google?redirect=/booking successful login its redirect into http://localhost:5173/booking
router.get("/google/callback", passport.authenticate("google", {
    failureRedirect: `{envVars.FRONTEND_URL}/login?error=There is some issues with your account. Please contact with out support team!`
}), AuthController.googleCallbackController)

export const AuthRoutes = router;
