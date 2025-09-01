/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unused-imports/no-unused-vars */
import { NextFunction, Request, Response } from "express"
import { sendResponse } from "../../utils/sendResponse"
import { catchAsync } from "../../utils/catchAsync"
import { SOSServices } from "./sos.service"
import { JwtPayload } from "jsonwebtoken"

const addEmergencyContact = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const result = await SOSServices.addEmergencyContact(req.user as JwtPayload, req.body.emergencyContactEmail)
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Emergency Contact Added Successfully",
        data: result
    })
})

const sendSosMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const { rideId } = req.params
    const payload = req.body
    const decodedToken = req.user as JwtPayload


    const result = await SOSServices.sendSosMessage(rideId, payload, decodedToken)
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "SOS Message Sent Successfully",
        data: result
    })
})

const updateSosStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const { sosId } = req.params
    const payload = req.body


    const result = await SOSServices.updateSosStatus(sosId, payload)
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "SOS Status Updated Successfully",
        data: result
    })
})


export const SOSController = {
    addEmergencyContact,
    sendSosMessage,
    updateSosStatus
}