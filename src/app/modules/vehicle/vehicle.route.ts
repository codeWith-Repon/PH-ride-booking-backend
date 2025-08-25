import { Router } from "express";
import { vehicleController } from "./vehicle.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createVehicleZodSchema, updateVehicleZodSchema } from "./vehicle.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { multerUpload } from "../../config/multer.config";


const router = Router()

router.post("/register",
    checkAuth(...Object.values(Role)),
    multerUpload.array("files"),
    validateRequest(createVehicleZodSchema),
    vehicleController.createVehicle)

router.get("/vehicles",
    checkAuth(...Object.values(Role)),
    vehicleController.getAllVehicle)

router.get("/:vehicleId",
    checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DRIVER),
    vehicleController.getSingleVehicle)

router.patch("/update/:vehicleId",
    checkAuth(...Object.values(Role)),
    multerUpload.array("files"),
    validateRequest(updateVehicleZodSchema),
    vehicleController.updateVehicle)


export const vehicleRoutes = router