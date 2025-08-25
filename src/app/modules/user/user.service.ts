import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { IAuthProvider, IUser, Role } from "./user.interface";
import { User } from "./user.model";
import bcryptjs from "bcryptjs"
// import { deleteImageFromCloudinary } from "../../config/cloudinary.config";

const createUser = async (payload: Partial<IUser>) => {
    const { email, password, ...rest } = payload

    const isUserExist = await User.findOne({ email });

    if (isUserExist) {
        throw new AppError(400, "User Already Exist!!");
    }

    const hashedPassword = await bcryptjs.hash(password as string, Number(envVars.BCRYPT_SALT_ROUND))

    const authProvider: IAuthProvider = { provider: "credentials", providerId: email as string }

    const user = await User.create({
        email,
        password: hashedPassword,
        auths: [authProvider],
        ...rest
    })
    const userObj = user.toObject();
    delete userObj.password;

    return userObj;
}

const getAllUser = async () => {
    const user = User.find().select("-password");
    return user
}
const getSingleUser = async (userId: string) => {
    const user = User.findById(userId).select("-password");
    return user
}
const updateUser = async (payload: IUser, decodedToken: JwtPayload) => {

    if (payload.role) {
        if (
            decodedToken.role !== Role.SUPER_ADMIN &&
            decodedToken.role !== Role.ADMIN
        ) {
            throw new AppError(403, "Only SUPER_ADMIN or ADMIN can change roles");
        }

        if (decodedToken.role === Role.ADMIN &&
            (payload.role === Role.ADMIN ||
                payload.role === Role.SUPER_ADMIN)
        ) {
            throw new AppError(403, "Only SUPER_ADMIN can assign ADMIN or SUPER_ADMIN role");
        }
    }

    if (payload.isActive !== undefined ||
        payload.isDeleted !== undefined ||
        payload.isVerified !== undefined) {
        if (decodedToken.role === Role.RIDER || decodedToken.role === Role.DRIVER) {
            throw new AppError(403, "You are not authorized to modify this field");
        }
    }

    if (payload.password) {
        payload.password = await bcryptjs.hash(payload.password, Number(envVars.BCRYPT_SALT_ROUND))
    }

    // if (payload.image) {
    //     const existUser = await User.findById(decodedToken.userId)
    //     await deleteImageFromCloudinary(existUser?.image as string)
    // }

    const updatedUser = await User.findByIdAndUpdate(decodedToken.userId, payload, { new: true, runValidators: true })

    if (!updatedUser) {
        throw new AppError(500, "Failed to update user");
    }

    const userObj = updatedUser.toObject();
    delete userObj.password;

    return userObj
}

const getMe = async (decodedToken: JwtPayload) => {
    const user = User.findById(decodedToken.userId).select("-password");
    return user
}



export const UserServices = {
    createUser,
    getAllUser,
    getSingleUser,
    updateUser,
    getMe
}