import { NextFunction, Request, Response } from "express"
import AppError from "../errorHelpers/AppError"
import { verifyToken } from "../utils/jwt"
import { JwtPayload } from "jsonwebtoken"
import { IsActive } from "../modules/user/user.interface"
import { envVars } from "../config/env"
import { User } from "../modules/user/user.model"


export const checkAuth = (...authRoles: string[]) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accessToken = req.headers.authorization || req.cookies.accessToken

        if (!accessToken) {
            throw new AppError(403, "No token received")
        }

        const verifiedToken = verifyToken(accessToken, envVars.JWT_ACCESS_SECRET) as JwtPayload

        const isUserExist = await User.findOne({ email: verifiedToken.email })

        if (!isUserExist) {
            throw new AppError(400, "User does't exit")
        }


        if (isUserExist.isActive === IsActive.BLOCKED || isUserExist.isActive === IsActive.INACTIVE) {
            throw new AppError(400, `User is ${isUserExist.isActive}!`)
        }

        if (isUserExist.isDeleted) {
            throw new AppError(400, `User is deleted!`)
        }

        if (!isUserExist.isVerified) {
            throw new AppError(400, "User is not verified!")
        }

        if (!authRoles.includes(verifiedToken.role)) {

            throw new AppError(403, "You are not permitted to view this route!!")
        }

        req.user = verifiedToken

        next()

    } catch (error) {
        next(error)
    }
}