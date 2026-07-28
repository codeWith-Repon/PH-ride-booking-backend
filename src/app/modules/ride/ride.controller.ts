/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { RideServices } from "./ride.service"
import { sendResponse } from "../../utils/sendResponse"
import { JwtPayload } from "jsonwebtoken"

const createRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const result = await RideServices.createRide(req.body, req.user as JwtPayload)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Ride Created Successfully",
        data: result
    })
})

const updateRideStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body
    const { rideId } = req.params
    const decodedToken = req.user as JwtPayload
    const result = await RideServices.updateRideStatus(payload, decodedToken, rideId)

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
    const result = await RideServices.otpVerify(payload, decodedToken, req.params.rideId)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Ride OTP Verified Successfully",
        data: result
    })
})

const getAllRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const result = await RideServices.getAllRide(req.query as Record<string, string>)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "All Ride Retrieved Successfully!",
        data: result
    })
})

const getSingleRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const { rideId } = req.params;
    const result = await RideServices.getSingleRide(rideId)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Ride Retrieved Successfully!",
        data: result
    })
})

const getRideHistory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const decodedToken = req.user as JwtPayload
    const result = await RideServices.getRideHistory(decodedToken)

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Ride History Retrieved Successfully!",
        data: result
    })
})

const getCurrentRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const decodedToken = req.user as JwtPayload
    const result = await RideServices.getCurrentRide(decodedToken)

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Current Ride Retrieved Successfully!",
        data: result
    })
})

const rateRide = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { rideId } = req.params
    const payload = req.body as { rating: number; comment?: string }
    const decodedToken = req.user as JwtPayload

    const result = await RideServices.rateRide(rideId, payload, decodedToken)

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Thanks for your rating",
        data: result
    })
})

const updateMyLocation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user as JwtPayload
    const { lat, lng } = req.body as { lat: number; lng: number }

    const result = await RideServices.updateMyLocationAsRider(decodedToken.userId, { lat, lng })

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Location updated",
        data: result
    })
})

export const rideController = {
    createRide,
    updateRideStatus,
    otpVerify,
    getAllRide,
    getSingleRide,
    getRideHistory,
    getCurrentRide,
    rateRide,
    updateMyLocation
}