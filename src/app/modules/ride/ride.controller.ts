/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { RideServices } from "./ride.service"
import { sendResponse } from "../../utils/sendResponse"
import { JwtPayload } from "jsonwebtoken"

const createRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const result = await RideServices.createRide(req.body)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Ride Created Successfully",
        data: result
    })
})

const updateRideStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body
    const decodedToken = req.user as JwtPayload
    const result = await RideServices.updateRideStatus(payload, decodedToken)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Ride Status Changed Successfully",
        data: result
    })
})

const otpVerify = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body
    const decodedToken = req.user as JwtPayload
    const result = await RideServices.otpVerify(payload, decodedToken)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Ride OTP Verified Successfully",
        data: result
    })
})

export const rideController = {
    createRide,
    updateRideStatus,
    otpVerify
}