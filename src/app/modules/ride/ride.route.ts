import { Router } from "express";
import { rideController } from "./ride.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createRideZodSchema } from "./ride.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";


const router = Router()
router.post("/create",
    validateRequest(createRideZodSchema),
    checkAuth(...Object.values(Role)),
    rideController.createRide)


export const rideRoutes = router