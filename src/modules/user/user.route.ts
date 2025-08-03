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
    multerUpload.single("file"),
    validateRequest(createUserZodSchema),
    UserController.createUser
)

router.get(
    "/all-user",
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
    "/:userId",
    multerUpload.single("file"),
    validateRequest(updateUserZodSchema),
    checkAuth(...Object.values(Role)),
    UserController.updateUser
)


export const userRoutes = router