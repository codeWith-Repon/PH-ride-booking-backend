/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { vehicleService } from "./vehicle.service"
import { sendResponse } from "../../utils/sendResponse"
import { JwtPayload } from "jsonwebtoken"



const createVehicle = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body
    const result = await vehicleService.createVehicle(payload)
    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Vehicle Registered Successfully",
        data: result
    })
})

const updateVehicle = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user as JwtPayload
    const { vehicleId } = req.params
    const payload = req.body

    const result = await vehicleService.updateVehicle(payload, vehicleId, decodedToken)
    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Vehicle Updated Successfully",
        data: result
    })
})

const getAllVehicle = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const result = await vehicleService.getAllVehicle()
    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Vehicles retrieved Successfully",
        data: result
    })
})

const getSingleVehicle = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const { vehicleId } = req.params
    const result = await vehicleService.getSingleVehicle(vehicleId)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Vehicles retrieved Successfully",
        data: result
    })
})


export const vehicleController = {
    createVehicle,
    updateVehicle,
    getAllVehicle,
    getSingleVehicle
}