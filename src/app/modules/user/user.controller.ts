/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unused-imports/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { UserServices } from "./user.service";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";

const createUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const result = await UserServices.createUser(req.body)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "User Created Successfully",
        data: result
    })
})

const getAllUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const result = await UserServices.getAllUser()

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Users retrieved successfully",
        data: result
    })
})

const getSingleUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const { userId } = req.params
    const result = await UserServices.getSingleUser(userId)

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "User retrieved successfully",
        data: result
    })
})

const updateUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const { userId } = req.params
    const payload = req.body
    const decodedToken = req.user

    const result = await UserServices.updateUser(userId, payload, decodedToken)

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "User updated successfully",
        data: result
    })
})

const getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const decodedToken = req.user
    const result = await UserServices.getMe(decodedToken)

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Your Profile Retrieved successfully",
        data: result
    })
})

export const UserController = {
    createUser,
    getAllUser,
    getSingleUser,
    updateUser,
    getMe
}