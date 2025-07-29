import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createUserZodSchema } from "./user.validation";
import { Role } from "./user.interface";
import { checkAuth } from "../../middlewares/checkAuth";
import { Router } from "express";


const router = Router()

router.post(
    "/create-user",
    validateRequest(createUserZodSchema),
    UserController.createUser
)

router.get(
    "/all-user",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    UserController.getAllUser
)
router.get(
    "/:userId",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    UserController.getSingleUser
)
router.patch(
    "/:userId",
    checkAuth(...Object.values(Role)),
    UserController.updateUser
)


export const userRoutes = router