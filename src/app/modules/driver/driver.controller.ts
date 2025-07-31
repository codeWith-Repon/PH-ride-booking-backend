/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { driverService } from "./driver.service"
import { sendResponse } from "../../utils/sendResponse"
import { IDriver } from "./driver.interface"

const createDriver = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const payload = req.body as IDriver
    const result = await driverService.createDriver(payload)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Vehicles retrieved Successfully",
        data: result
    })
})

export const driverController = {
    createDriver
}