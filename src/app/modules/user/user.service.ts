import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { IAuthProvider, IUser, Role } from "./user.interface";
import { User } from "./user.model";
import bcryptjs from "bcryptjs"

const createUser = async (payload: Partial<IUser>) => {
    const { email, password, phone, ...rest } = payload

    const isUserExist = await User.findOne({ email });

    if (isUserExist) {
        throw new AppError(400, "User Already Exist!!");
    }

    if (phone) {
        const isPhoneExist = await User.findOne({ phone });
        if (isPhoneExist) {
            throw new AppError(400, "Phone Already Exist!!");
        }
    }

    const hashedPassword = await bcryptjs.hash(password as string, Number(envVars.BCRYPT_SALT_ROUND))

    const authProvider: IAuthProvider = { provider: "credentials", providerId: email as string }

    const user = await User.create({
        email,
        password: hashedPassword,
        phone,
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
const updateUser = async (userId: string, payload: IUser, decodedToken: JwtPayload) => {

    // const isUserExist = User.findById(userId)

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

    if (payload.isActive || payload.isDeleted || payload.isVerified) {
        if (decodedToken.role === Role.RIDER || decodedToken.role === Role.DRIVER) {
            throw new AppError(403, "You are not authorized to modify this field");
        }
    }

    if (payload.password) {
        payload.password = await bcryptjs.hash(payload.password, Number(envVars.BCRYPT_SALT_ROUND))
    }

    const updatedUser = await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true })

    if (!updatedUser) {
        throw new AppError(500, "Failed to update user");
    }

    const userObj = updatedUser.toObject();
    delete userObj.password;

    return userObj
}



export const UserServices = {
    createUser,
    getAllUser,
    getSingleUser,
    updateUser
}