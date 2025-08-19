/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { createNewAccessTokenWithRefreshToken } from "../../utils/userToken";
import { User } from "../user/user.model";
import bcryptjs from "bcryptjs"
import { envVars } from "../../config/env";
import { IAuthProvider } from "../user/user.interface";


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

    user!.password = await bcryptjs.hash(newPassword, Number(envVars.BCRYPT_SALT_ROUND))

    user!.save()

}


export const AuthService = {
    // credentialsLogin,
    setPassword,
    getNewAccessToken,
    changePassword
}