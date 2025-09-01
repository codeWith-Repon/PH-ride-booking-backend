import { Router } from "express";
import { rideController } from "./ride.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createRideZodSchema, updateRideStatusZodSchema } from "./ride.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";


const router = Router()

router.post("/book",
    validateRequest(createRideZodSchema),
    checkAuth(...Object.values(Role)),
    rideController.createRide)

router.post("/verify-otp",
    checkAuth(...Object.values(Role)),
    rideController.otpVerify)

router.get("/rides",
    checkAuth(...Object.values(Role)),
    rideController.getAllRide)

router.get("/current-ride",
    checkAuth(...Object.values(Role)),
    rideController.getCurrentRide)

router.get("/history",
    checkAuth(Role.DRIVER, Role.RIDER),
    rideController.getRideHistory)

router.post("/set-fare/:rideId",
    checkAuth(...Object.values(Role)),
    rideController.setRideFare)

router.post("/update-status/:rideId",
    validateRequest(updateRideStatusZodSchema),
    checkAuth(...Object.values(Role)),
    rideController.updateRideStatus)

router.get("/:rideId",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    rideController.getSingleRide)


export const rideRoutes = router