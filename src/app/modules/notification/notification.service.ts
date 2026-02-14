/* eslint-disable @typescript-eslint/no-explicit-any */
import { Notification } from "./notification.model";

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
    return await Notification.create(payload);
};

export const NotificationServices = {
    getMyNotifications,
    markAllAsRead,
    markAsRead,
    createNotification
};