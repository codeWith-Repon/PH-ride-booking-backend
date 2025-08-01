/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { RideServices } from "./ride.service"
import { sendResponse } from "../../utils/sendResponse"

const createRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const result = await RideServices.createRide(req.body)
    

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Ride Created Successfully",
        data: result
    })
})

export const rideController = {
    createRide
}