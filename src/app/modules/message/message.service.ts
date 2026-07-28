import { Types } from "mongoose";
import AppError from "../../errorHelpers/AppError";
import { Ride } from "../ride/ride.model";
import { RIDE_STATUS } from "../ride/ride.interface";
import { Driver } from "../driver/driver.model";
import { Message } from "./message.model";

const ACTIVE_STATUSES: string[] = [
    RIDE_STATUS.ACCEPTED,
    RIDE_STATUS.PICKED_UP,
    RIDE_STATUS.IN_TRANSIT
];

/**
 * Resolves the chat counterpart for a ride.
 * Returns { riderUserId, driverUserId } as strings, or throws if caller isn't a participant.
 */
const resolveParticipants = async (rideId: string, callerUserId: string) => {
    if (!Types.ObjectId.isValid(rideId)) {
        throw new AppError(400, "Invalid ride id");
    }

    const ride = await Ride.findById(rideId).select("user driver rideStatus");
    if (!ride) {
        throw new AppError(404, "Ride not found");
    }

    const riderUserId = ride.user.toString();
    let driverUserId: string | null = null;

    if (ride.driver) {
        const driver = await Driver.findById(ride.driver).select("user");
        if (driver) driverUserId = driver.user.toString();
    }

    const isRider = callerUserId === riderUserId;
    const isDriver = driverUserId !== null && callerUserId === driverUserId;
    if (!isRider && !isDriver) {
        throw new AppError(403, "You are not a participant of this ride");
    }

    return {
        ride,
        riderUserId,
        driverUserId,
        isRider,
        isDriver
    };
};

const sendMessage = async (
    rideId: string,
    senderUserId: string,
    text: string
) => {
    const { ride, riderUserId, driverUserId, isRider } = await resolveParticipants(
        rideId,
        senderUserId
    );

    if (!ACTIVE_STATUSES.includes(ride.rideStatus)) {
        throw new AppError(400, "Chat is only available during an active ride");
    }

    if (!driverUserId) {
        throw new AppError(400, "Ride has no driver assigned");
    }

    const recipientUserId = isRider ? driverUserId : riderUserId;

    const created = await Message.create({
        ride: ride._id,
        sender: new Types.ObjectId(senderUserId),
        recipient: new Types.ObjectId(recipientUserId),
        text
    });

    const message = await created.populate([
        { path: "sender", select: "name role image" },
        { path: "recipient", select: "name role image" }
    ]);

    return { message, recipientUserId };
};

const getRideMessages = async (rideId: string, callerUserId: string) => {
    await resolveParticipants(rideId, callerUserId);

    return Message.find({ ride: rideId })
        .sort({ createdAt: 1 })
        .populate("sender", "name role image")
        .populate("recipient", "name role image");
};

const markRideMessagesRead = async (rideId: string, callerUserId: string) => {
    await resolveParticipants(rideId, callerUserId);

    const now = new Date();
    const result = await Message.updateMany(
        { ride: rideId, recipient: callerUserId, readAt: null },
        { $set: { readAt: now } }
    );

    return { modifiedCount: result.modifiedCount, readAt: now };
};

export const MessageServices = {
    resolveParticipants,
    sendMessage,
    getRideMessages,
    markRideMessagesRead
};
