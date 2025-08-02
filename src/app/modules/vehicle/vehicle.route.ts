import { Router } from "express";
import { vehicleController } from "./vehicle.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createVehicleZodSchema, updateVehicleZodSchema } from "./vehicle.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { multerUpload } from "../../config/multer.config";


const router = Router()

router.post("/create",
    multerUpload.array("files"),
    validateRequest(createVehicleZodSchema),
    checkAuth(...Object.values(Role)),
    vehicleController.createVehicle)

router.get("/",
    checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
    vehicleController.getAllVehicle)

router.get("/:vehicleId",
    checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
    vehicleController.getSingleVehicle)

router.patch("/update/:vehicleId",
    multerUpload.array("files"),
    validateRequest(updateVehicleZodSchema),
    checkAuth(...Object.values(Role)),
    vehicleController.updateVehicle)


export const vehicleRoutes = router