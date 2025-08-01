import { Router } from "express";
import { rideController } from "./ride.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createRideZodSchema, updateRideStatusZodSchema } from "./ride.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";


const router = Router()

router.post("/create",
    validateRequest(createRideZodSchema),
    checkAuth(...Object.values(Role)),
    rideController.createRide)

router.post("/update-status",
    validateRequest(updateRideStatusZodSchema),
    checkAuth(...Object.values(Role)),
    rideController.updateRideStatus)

router.post("/verify-otp",
    checkAuth(...Object.values(Role)),
    rideController.otpVerify)


export const rideRoutes = router