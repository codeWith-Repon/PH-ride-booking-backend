import { Router } from "express";
import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createUserZodSchema } from "./user.validation";

const router = Router()

router.post(
    "/create-user",
    validateRequest(createUserZodSchema),
    UserController.createUser
)

router.get(
    "/all-user",
    UserController.getAllUser
)

router.get(
    "/:userId",
    UserController.getSingleUser
)


export const userRoutes = router