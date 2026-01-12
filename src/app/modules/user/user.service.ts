import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../../config/env";
import AppError from "../../errorHelpers/AppError";
import { IAuthProvider, IUser, Role } from "./user.interface";
import { User } from "./user.model";
import bcryptjs from "bcryptjs"
import { QueryBuilder } from "../../utils/QueryBuilder";
import { userSearchableFields } from "./user.constant";
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
        emergencyContactEmail: [envVars.DEFAULT_EMERGENCY_EMAIL],
        ...rest
    })
    const userObj = user.toObject();
    delete userObj.password;

    return userObj;
}

const getAllUser = async (query: Record<string, string>) => {
    const userQuery = User.find().select("-password");

    const queryBuilder = new QueryBuilder(userQuery, query);

    await queryBuilder.search(userSearchableFields)
    await queryBuilder.filter();


    queryBuilder
        .sort()
        .paginate()
        .fields();

    const [data, meta] = await Promise.all([
        queryBuilder.build(),
        queryBuilder.getMeta()
    ]);

    return {
        meta,
        data
    };
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

    if (payload.phone) {
        const existUser = await User.findOne({ _id: { $ne: decodedToken.userId }, phone: payload.phone })
        if (existUser?.phone === payload.phone) {
            throw new AppError(400, "Phone number already exist")
        }
    }

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