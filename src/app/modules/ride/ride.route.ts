import { Router } from "express";
import { rideController } from "./ride.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createRideZodSchema, rateRideZodSchema, updateRideStatusZodSchema, updateRiderLocationZodSchema } from "./ride.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";


const router = Router()

router.post("/book",
    validateRequest(createRideZodSchema),
    checkAuth(...Object.values(Role)),
    rideController.createRide)

router.post("/verify-otp/:rideId",
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

router.patch("/me/location",
    validateRequest(updateRiderLocationZodSchema),
    checkAuth(Role.RIDER),
    rideController.updateMyLocation)


router.post("/update-status/:rideId",
    validateRequest(updateRideStatusZodSchema),
    checkAuth(...Object.values(Role)),
    rideController.updateRideStatus)

router.post("/:rideId/rate",
    validateRequest(rateRideZodSchema),
    checkAuth(Role.RIDER),
    rideController.rateRide)

router.get("/:rideId",
    checkAuth(...Object.values(Role)),
    rideController.getSingleRide)


export const rideRoutes = router