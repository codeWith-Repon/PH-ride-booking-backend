import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { TrackingController } from "./tracking.controller";

const router = Router();

router.post(
    "/:rideId/location",
    checkAuth(Role.DRIVER),
    TrackingController.publishLocation
);

router.get(
    "/:rideId/latest",
    checkAuth(...Object.values(Role)),
    TrackingController.getLatestLocation
);

router.get(
    "/:rideId/path",
    checkAuth(...Object.values(Role)),
    TrackingController.getRidePath
);

export const trackingRoutes = router;
