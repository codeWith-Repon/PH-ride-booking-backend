import { Router } from "express";
import { vehicleController } from "./vehicle.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createVehicleZodSchema, updateVehicleZodSchema } from "./vehicle.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";


const router = Router()

router.post("/create",
    validateRequest(createVehicleZodSchema),
    checkAuth(...Object.values(Role)),
    vehicleController.createVehicle)

router.get("/",
    checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
    vehicleController.getAllVehicle)

router.get("/:vehicleId",
    validateRequest(updateVehicleZodSchema),
    checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
    vehicleController.getSingleVehicle)

router.patch("/update/:vehicleId",
    validateRequest(updateVehicleZodSchema),
    checkAuth(...Object.values(Role)),
    vehicleController.updateVehicle)


export const vehicleRoutes = router