import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createUserZodSchema, updateUserZodSchema } from "./user.validation";
import { Role } from "./user.interface";
import { checkAuth } from "../../middlewares/checkAuth";
import { Router } from "express";
import { multerUpload } from "../../config/multer.config";


const router = Router()

router.post(
    "/register-user",
    validateRequest(createUserZodSchema),
    UserController.createUser
)

router.get(
    "/users",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    UserController.getAllUser
)
router.get(
    "/get-me",
    checkAuth(...Object.values(Role)),
    UserController.getMe
)
router.get(
    "/:userId",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    UserController.getSingleUser
)
router.patch(
    "/update",
    checkAuth(...Object.values(Role)),
    multerUpload.single("file"),
    validateRequest(updateUserZodSchema),
    UserController.updateUser
)


export const userRoutes = router