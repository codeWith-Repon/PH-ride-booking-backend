import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { MatchingController } from "./matching.controller";

const router = Router();

router.post(
    "/candidates",
    checkAuth(...Object.values(Role)),
    MatchingController.findCandidates
);

router.post(
    "/best",
    checkAuth(...Object.values(Role)),
    MatchingController.findBest
);

export const matchingRoutes = router;
