import { Router } from "express";
import { SOSController } from "./sos.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { addEmergencyContactZodSchema, sendSosMessageZodSchema } from "./sos.validation";
import validateRequest from "../../middlewares/validateRequest";


const router = Router()

router.post("/add-contact",
    checkAuth(...Object.values(Role)),
    validateRequest(addEmergencyContactZodSchema),
    SOSController.addEmergencyContact)

router.post("/send-message/:rideId",
    checkAuth(...Object.values(Role)),
    validateRequest(sendSosMessageZodSchema),
    SOSController.sendSosMessage)

export const SOSRoutes = router