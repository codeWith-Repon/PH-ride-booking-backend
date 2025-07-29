/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import AppError from "../../errorHelpers/AppError";
import { createUserToken } from "../../utils/userToken";
import { IUser } from "../user/user.interface";
import { User } from "../user/user.model";
import bcryptjs from "bcryptjs"

const credentialsLogin = async (payload: Partial<IUser>) => {
    const { email, password } = payload

    const isUserExist = await User.findOne({ email })

    if (!isUserExist) {
        throw new AppError(404, "Email does't exit")
    }

    const isPasswordMatched = await bcryptjs.compare(password as string, isUserExist.password)

    if (!isPasswordMatched) {
        throw new AppError(400, "Incorrect password")
    }

    const userTokens = createUserToken(isUserExist)


    const { password: pass, ...rest } = isUserExist.toObject()

    return {
        accessToken: userTokens.accessToken,
        refreshToken: userTokens.refreshToken,
        user: rest
    }
}


export const AuthService = {
    credentialsLogin
}