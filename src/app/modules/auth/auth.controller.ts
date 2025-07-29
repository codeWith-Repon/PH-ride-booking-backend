/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unused-imports/no-unused-vars */
import { NextFunction, Request, Response } from "express"
import { sendResponse } from "../../utils/sendResponse"
import { AuthService } from "./auth.service"
import { catchAsync } from "../../utils/catchAsync"

const credentialsLogin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const result = await AuthService.credentialsLogin(req.body)

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Users log in successfully",
        data: result
    })
})

export const AuthController = {
    credentialsLogin
}