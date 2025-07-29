import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { IAuthProvider, IUser } from "./user.interface";
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

    return user
}

const getAllUser = async () => {
    const user = User.find().select("-password");
    return user
}
const getSingleUser = async (userId: string) => {
    const user = User.findById(userId).select("-password");
    return user
}



export const UserServices = {
    createUser,
    getAllUser,
    getSingleUser
}