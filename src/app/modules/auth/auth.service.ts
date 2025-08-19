/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { createNewAccessTokenWithRefreshToken } from "../../utils/userToken";
import { User } from "../user/user.model";
import bcryptjs from "bcryptjs"
import { envVars } from "../../config/env";
import { IAuthProvider, IsActive } from "../user/user.interface";
import jwt from "jsonwebtoken"
import { sendEmail } from "../../utils/sendEmail";


// const credentialsLogin = async (payload: Partial<IUser>) => {
//     const { email, password } = payload

//     const isUserExist = await User.findOne({ email })

//     if (!isUserExist) {
//         throw new AppError(404, "Email does't exit")
//     }

//     const isPasswordMatched = await bcryptjs.compare(password as string, isUserExist.password as string)

//     if (!isPasswordMatched) {
//         throw new AppError(400, "Incorrect password")
//     }

//     const userTokens = createUserToken(isUserExist)


//     const { password: pass, ...rest } = isUserExist.toObject()

//     return {
//         accessToken: userTokens.accessToken,
//         refreshToken: userTokens.refreshToken,
//         user: rest
//     }
// }

const getNewAccessToken = async (refreshToken: string) => {

    const newAccessToken = await createNewAccessTokenWithRefreshToken(refreshToken)

    return {
        accessToken: newAccessToken
    }
}

const setPassword = async (plainPassword: string, decodedToken: JwtPayload) => {
    const user = await User.findById(decodedToken.userId)

    if (user?.password && user.auths.some(provider => provider.provider === "google")) {
        throw new AppError(400, "You have already set your password. Now you can change you Password from your profile password update.");
    }

    const hashedPassword = await bcryptjs.hash(plainPassword, Number(envVars.BCRYPT_SALT_ROUND))

    const credentialsProvider: IAuthProvider = {
        provider: "credentials",
        providerId: user?.email as string
    }

    const auths: IAuthProvider[] = [...user!.auths, credentialsProvider]

    user!.password = hashedPassword

    user!.auths = auths

    user!.save()
}

const changePassword = async (oldPassword: string, newPassword: string, decodedToken: JwtPayload) => {

    const user = await User.findById(decodedToken.userId)

    const isPasswordMatched = await bcryptjs.compare(oldPassword, user?.password as string)

    if (!isPasswordMatched) {
        throw new AppError(401, "Old Password does not match")
    }

    const isSameAsOld = await bcryptjs.compare(newPassword, user?.password as string)

    if (isSameAsOld) {
        throw new AppError(400, "New password can not be same as old password")
    }

    user!.password = await bcryptjs.hash(newPassword, Number(envVars.BCRYPT_SALT_ROUND))

    user!.save()

}

const forgotPassword = async (email: string) => {
    const isUserExist = await User.findOne({ email })

    if (!isUserExist) {
        throw new AppError(400, "User does not exist")
    }

    if (!isUserExist.isVerified) {
        throw new AppError(400, "User is not verified")
    }

    if (isUserExist.isActive === IsActive.BLOCKED || isUserExist.isActive === IsActive.INACTIVE) {
        throw new AppError(400, `User is ${isUserExist.isActive}`)
    }

    if (isUserExist.isDeleted) {
        throw new AppError(400, "User is deleted")
    }

    const JwtPayload = {
        userId: isUserExist._id,
        email: isUserExist.email,
        role: isUserExist.role
    }

    const resetToken = jwt.sign(JwtPayload, envVars.JWT_ACCESS_SECRET, {
        expiresIn: "10m"
    })

    const resetUILink = `${envVars.FRONTEND_URL}/reset-password?id=${isUserExist._id}&token=${resetToken}`

    sendEmail({
        to: isUserExist.email,
        subject: "Password Reset",
        templateName: "forgetPassword",
        templateData: {
            name: isUserExist.name,
            resetUILink
        }
    })
}

const resetPassword = async (payload: Record<string, any>, decodedToken: JwtPayload) => {
    if (payload.id != decodedToken.userId) {
        throw new AppError(401, "You can not reset your password")
    }

    const isUserExist = await User.findById(decodedToken.userId)

    if (!isUserExist) {
        throw new AppError(400, "User does not exist")
    }

    const hashedPassword = await bcryptjs.hash(payload.newPassword, Number(envVars.BCRYPT_SALT_ROUND))

    isUserExist.password = hashedPassword

    await isUserExist.save()
}


export const AuthService = {
    // credentialsLogin,
    setPassword,
    getNewAccessToken,
    changePassword,
    forgotPassword,
    resetPassword
}