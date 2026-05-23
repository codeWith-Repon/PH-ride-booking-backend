import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import validateRequest from "../../middlewares/validateRequest";
import { sendMessageZodSchema } from "./message.validation";
import { MessageController } from "./message.controller";

const router = Router();

router.get(
    "/ride/:rideId",
    checkAuth(Role.RIDER, Role.DRIVER, Role.ADMIN, Role.SUPER_ADMIN),
    MessageController.getRideMessages
);

router.post(
    "/ride/:rideId",
    checkAuth(Role.RIDER, Role.DRIVER),
    validateRequest(sendMessageZodSchema),
    MessageController.sendMessage
);

router.patch(
    "/ride/:rideId/read",
    checkAuth(Role.RIDER, Role.DRIVER),
    MessageController.markRideMessagesRead
);

export const messageRoutes = router;
