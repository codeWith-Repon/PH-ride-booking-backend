import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get("/", checkAuth(...Object.values(Role)), NotificationController.getMyNotifications);
router.patch("/mark-read/:notificationId", checkAuth(...Object.values(Role)), NotificationController.markAsRead);
router.patch("/mark-all-read", checkAuth(...Object.values(Role)), NotificationController.markAllAsRead);


export const notificationRoutes = router;