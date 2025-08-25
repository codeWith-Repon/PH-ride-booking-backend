/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { vehicleService } from "./vehicle.service"
import { sendResponse } from "../../utils/sendResponse"
import { JwtPayload } from "jsonwebtoken"
import { IVehicle } from "./vehicle.interface"



const createVehicle = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const payload: IVehicle = {
        ...req.body,
        images: files.map(file => file.path)
    }
    const decodedToken = req.user as JwtPayload
    const result = await vehicleService.createVehicle(payload, decodedToken)
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
    const payload: IVehicle = {
        ...req.body,
        images: ((req.files as Express.Multer.File[] || []).map(file => file.path))
    }

    const result = await vehicleService.updateVehicle(payload, vehicleId, decodedToken)
    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Vehicle Updated Successfully",
        data: result
    })
})

const getAllVehicle = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const query = req.query

    const result = await vehicleService.getAllVehicle(query as Record<string, string>)
    sendResponse(res, {
        success: true,
        statusCode: 200,
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