/* eslint-disable @typescript-eslint/no-explicit-any */
import { Notification } from "./notification.model";
import { wsBroadcast } from "../../ws";

const getMyNotifications = async (userId: string) => {
    return await Notification.find({ recipient: userId })
        .populate({
            path: "ride",
            select: "pickupLocation dropLocation rideStatus",
        })
        .sort({ createdAt: -1 })
        .limit(10);
};

const markAllAsRead = async (userId: string) => {
    return await Notification.updateMany(
        { recipient: userId, isRead: false },
        { $set: { isRead: true } }
    );
};

const markAsRead = async (userId: string, notificationId: string) => {
    return await Notification.updateMany(
        { recipient: userId, _id: notificationId, isRead: false },
        { $set: { isRead: true } }
    );
};

const createNotification = async (payload: {
    recipient: any;
    ride: any;
    title: string;
    message: string;
}) => {
    const notification = await Notification.create(payload);

    wsBroadcast.toUser(String(payload.recipient), {
        type: "notification:new",
        notification
    });

    return notification;
};

export const NotificationServices = {
    getMyNotifications,
    markAllAsRead,
    markAsRead,
    createNotification
};
