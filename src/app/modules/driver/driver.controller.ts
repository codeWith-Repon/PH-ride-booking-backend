/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { driverService } from "./driver.service"
import { sendResponse } from "../../utils/sendResponse"
import { IDriver } from "./driver.interface"
import { JwtPayload } from "jsonwebtoken"

const createDriver = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const payload = req.body as IDriver
    const result = await driverService.createDriver(payload)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Driver Registration Successful",
        data: result
    })
})

// const changeDriverStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

//     const payload = req.body as IDriver
//     const { driverId } = req.params
//     const decodedToken = req.user as JwtPayload

//     const result = await driverService.changeDriverStatus(driverId, decodedToken, payload)

//     sendResponse(res, {
//         success: true,
//         statusCode: 201,
//         message: "Driver Status Change Successful",
//         data: result
//     })
// })

const updateDriver = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driverId = req.params.driverId
    const payload = req.body as IDriver
    const decodedToken = req.user as JwtPayload

    const result = await driverService.updateDriver(driverId, decodedToken, payload)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Driver Updated Successfully",
        data: result
    })
})

const getAllDriver = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query
    const result = await driverService.getAllDriver(query as Record<string, string>)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Drivers retrieved Successfully",
        data: result
    })
})


const getAllFreeDriver = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const result = await driverService.getAllFreeDriver()

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Drivers retrieved Successfully",
        data: result
    })
})

const getSingleDriver = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { driverId } = req.params;

    const result = await driverService.getSingleDriver(driverId)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Driver retrieved Successfully",
        data: result
    })
})

export const driverController = {
    createDriver,
    // changeDriverStatus,
    updateDriver,
    getAllDriver,
    getSingleDriver,
    getAllFreeDriver
}