import { Router } from "express";
import { OTPController } from "./otp.controller";
import { otpLimiter } from "../../config/rateLimit.config";


const router = Router()

router.post("/send", otpLimiter, OTPController.sendOTP)
router.post("/verify", otpLimiter, OTPController.verifyOTP)

export const OtpRoutes = router