import { Router } from "express";
import { driverController } from "./driver.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createDriverZodSchema, updateDriverLocationZodSchema, updateDriverZodSchema } from "./driver.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";


const router = Router()

router.post("/register-driver",
    validateRequest(createDriverZodSchema),
    checkAuth(...Object.values(Role)),
    driverController.createDriver)

// router.post("/change-status/:driverId",
//     validateRequest(updateDriverZodSchema),
//     checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
//     driverController.changeDriverStatus)

router.get("/drivers",
    checkAuth(...Object.values(Role)),
    driverController.getAllDriver)

router.get("/free-drivers",
    // checkAuth(...Object.values(Role)),
    driverController.getAllFreeDriver)

router.patch("/me/location",
    checkAuth(Role.DRIVER),
    validateRequest(updateDriverLocationZodSchema),
    driverController.updateMyLocation)

router.get("/:driverId",
    checkAuth(...Object.values(Role)),
    driverController.getSingleDriver)

router.patch("/update/:driverId",
    validateRequest(updateDriverZodSchema),
    checkAuth(...Object.values(Role)),
    driverController.updateDriver)

export const driverRoutes = router