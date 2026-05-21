/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unused-imports/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { MatchingServices } from "./matching.service";
import { findCandidatesZodSchema } from "./matching.validation";

const findCandidates = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const input = findCandidatesZodSchema.parse(req.body);

    const result = await MatchingServices.findNearbyCandidates(
        { lat: input.lat, lng: input.lng },
        {
            maxRadiusKm: input.maxRadiusKm,
            limit: input.limit,
            maxStaleSeconds: input.maxStaleSeconds
        }
    );

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Driver candidates retrieved",
        data: result
    });
});

const findBest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const input = findCandidatesZodSchema.parse(req.body);

    const result = await MatchingServices.findBestDriver(
        { lat: input.lat, lng: input.lng },
        {
            maxRadiusKm: input.maxRadiusKm,
            maxStaleSeconds: input.maxStaleSeconds
        }
    );

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Best driver match",
        data: result
    });
});

export const MatchingController = {
    findCandidates,
    findBest
};
