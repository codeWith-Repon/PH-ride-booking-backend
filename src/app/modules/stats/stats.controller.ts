/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unused-imports/no-unused-vars */
import { catchAsync } from "../../utils/catchAsync";
import { NextFunction, Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { statsService } from "./stats.service";
import { IsActive } from "../user/user.interface";


const getMonthlyStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const status = req.query.status ? req.query.status : undefined;

    const data = await statsService.getMonthlyStats(month, year, status as IsActive);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Stats retrieved Successfully",
        data
    })
})

const getWeeklyTotalUserStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { month, year, status } = req.query;

    const monthNum = month ? parseInt(month as string) : undefined;
    const yearNum = year ? parseInt(year as string) : undefined;
    const statusFilter = status as IsActive | undefined

    const data = await statsService.getWeeklyTotalUserStats(monthNum, yearNum, statusFilter)

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Weekly stats retrieved Successfully",
        data
    })

})

export const StatsController = {
    getMonthlyStats,
    getWeeklyTotalUserStats
}