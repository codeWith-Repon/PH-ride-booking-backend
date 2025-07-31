import { Router } from "express";
import { driverController } from "./driver.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createDriverZodSchema } from "./driver.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";


const router = Router()

router.post("/create",
    validateRequest(createDriverZodSchema),
    checkAuth(...Object.values(Role)),
    driverController.createDriver)



export const driverRoutes = router