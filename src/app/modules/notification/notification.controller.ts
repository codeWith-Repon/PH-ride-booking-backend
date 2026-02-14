import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { NotificationServices } from "./notification.service";
import { sendResponse } from "../../utils/sendResponse";
import { JwtPayload } from "jsonwebtoken";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationServices.getMyNotifications((req.user as JwtPayload).userId);
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Notifications retrieved successfully",
        data: result
    });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
    await NotificationServices.markAllAsRead((req.user as JwtPayload).userId);
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "All notifications marked as read",
        data: null
    });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
    await NotificationServices.markAsRead((req.user as JwtPayload).userId, req.params.notificationId);
    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Notifications marked as read",
        data: null
    });
});

export const NotificationController = {
    getMyNotifications,
    markAllAsRead,
    markAsRead
};