import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { MessageServices } from "./message.service";
import { wsBroadcast } from "../../ws";

const sendMessage = catchAsync(async (req: Request, res: Response) => {
    const { rideId } = req.params;
    const { text } = req.body;
    const sender = req.user as JwtPayload;

    const { message, recipientUserId } = await MessageServices.sendMessage(
        rideId,
        sender.userId,
        text
    );

    wsBroadcast.toUser(recipientUserId, {
        type: "chat:new",
        rideId,
        message
    });
    wsBroadcast.toUser(sender.userId, {
        type: "chat:new",
        rideId,
        message
    });

    sendResponse(res, {
        success: true,
        statusCode: 201,
        message: "Message sent",
        data: message
    });
});

const getRideMessages = catchAsync(async (req: Request, res: Response) => {
    const { rideId } = req.params;
    const caller = req.user as JwtPayload;
    const result = await MessageServices.getRideMessages(rideId, caller.userId);

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Ride messages retrieved",
        data: result
    });
});

const markRideMessagesRead = catchAsync(async (req: Request, res: Response) => {
    const { rideId } = req.params;
    const caller = req.user as JwtPayload;
    const result = await MessageServices.markRideMessagesRead(rideId, caller.userId);

    wsBroadcast.toRideParticipants(rideId, {
        type: "chat:read",
        rideId,
        by: caller.userId,
        readAt: result.readAt
    });

    sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Messages marked as read",
        data: result
    });
});

export const MessageController = {
    sendMessage,
    getRideMessages,
    markRideMessagesRead
};
