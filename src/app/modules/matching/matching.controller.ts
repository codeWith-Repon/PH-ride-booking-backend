import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { matchingService } from "./matching.service";
import { IMatchQuery } from "./matching.interface";

const getCandidates = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const query = req.body as IMatchQuery;
    const result = await matchingService.getCandidates(query);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Driver candidates retrieved",
        data: result,
    });
});

const getBest = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const query = req.body as IMatchQuery;
    const result = await matchingService.getBest(query);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: result ? "Best driver match" : "No drivers nearby",
        data: result,
    });
});

export const matchingController = {
    getCandidates,
    getBest,
};
