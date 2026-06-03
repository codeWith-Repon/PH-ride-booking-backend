import { Router } from "express";
import { SOSController } from "./sos.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { addEmergencyContactZodSchema, updateSosStatusZodSchema } from "./sos.validation";
import validateRequest from "../../middlewares/validateRequest";


const router = Router()

router.get("/",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    SOSController.getAllSos)

router.post("/add-contact",
    checkAuth(...Object.values(Role)),
    validateRequest(addEmergencyContactZodSchema),
    SOSController.addEmergencyContact)

router.post("/send-message/:rideId",
    checkAuth(...Object.values(Role)),
    SOSController.sendSosMessage)

router.patch("/update-status/:sosId",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    validateRequest(updateSosStatusZodSchema),
    SOSController.updateSosStatus)

export const SOSRoutes = router