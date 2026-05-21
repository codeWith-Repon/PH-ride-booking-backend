/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unused-imports/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { TrackingServices } from "./tracking.service";
import { locationPingZodSchema } from "./tracking.validation";

const publishLocation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const input = locationPingZodSchema.parse({
        ...req.body,
        rideId: req.params.rideId
    });

    const result = await TrackingServices.savePing(input, req.user as JwtPayload);

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Location recorded",
        data: result
    });
});

const getLatestLocation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await TrackingServices.getLatestLocation(req.params.rideId, req.user as JwtPayload);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Latest location fetched",
        data: result
    });
});

const getRidePath = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const result = await TrackingServices.getRidePath(
        req.params.rideId,
        req.user as JwtPayload,
        req.query as { from?: string; to?: string; limit?: string }
    );

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Ride path fetched",
        data: result
    });
});

export const TrackingController = {
    publishLocation,
    getLatestLocation,
    getRidePath
};
