import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { matchQueryZodSchema } from "./matching.validation";
import { matchingController } from "./matching.controller";

const router = Router();

router.post(
    "/candidates",
    validateRequest(matchQueryZodSchema),
    checkAuth(...Object.values(Role)),
    matchingController.getCandidates
);

router.post(
    "/best",
    validateRequest(matchQueryZodSchema),
    checkAuth(...Object.values(Role)),
    matchingController.getBest
);

export const matchingRoutes = router;
