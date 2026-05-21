/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { Ride } from "../ride/ride.model";
import { Driver } from "../driver/driver.model";
import { Role } from "../user/user.interface";
import { RIDE_STATUS } from "../ride/ride.interface";
import { LocationPing } from "./tracking.model";
import { LocationPingInput } from "./tracking.validation";

const LIVE_RIDE_STATUSES = [
    RIDE_STATUS.ACCEPTED,
    RIDE_STATUS.PICKED_UP,
    RIDE_STATUS.IN_TRANSIT
];

const assertDriverOwnsRide = async (rideId: string, userId: string) => {
    const driver = await Driver.findOne({ user: userId });
    if (!driver) throw new AppError(404, "Driver profile not found");

    const ride = await Ride.findOne({
        _id: rideId,
        driver: driver._id,
        rideStatus: { $in: LIVE_RIDE_STATUSES }
    });
    if (!ride) throw new AppError(404, "No live ride found for this driver");

    return { ride, driver };
};

const assertCanSubscribeToRide = async (rideId: string, decoded: JwtPayload) => {
    const { userId, role } = decoded;

    const ride = await Ride.findById(rideId);
    if (!ride) throw new AppError(404, "Ride not found");

    if (role === Role.ADMIN || role === Role.SUPER_ADMIN) return ride;

    if (role === Role.RIDER) {
        if (ride.user.toString() !== userId) {
            throw new AppError(403, "You cannot subscribe to this ride");
        }
        return ride;
    }

    if (role === Role.DRIVER) {
        const driver = await Driver.findOne({ user: userId });
        if (!driver || ride.driver.toString() !== driver._id.toString()) {
            throw new AppError(403, "You cannot subscribe to this ride");
        }
        return ride;
    }

    throw new AppError(403, "Unauthorized");
};

const savePing = async (input: LocationPingInput, decoded: JwtPayload) => {
    if (decoded.role !== Role.DRIVER) {
        throw new AppError(403, "Only the assigned driver can publish location");
    }

    const { ride, driver } = await assertDriverOwnsRide(input.rideId, decoded.userId);

    const ping = await LocationPing.create({
        ride: ride._id,
        driver: driver._id,
        location: {
            type: "Point",
            coordinates: [input.lng, input.lat]
        },
        speed: input.speed,
        heading: input.heading,
        accuracy: input.accuracy,
        recordedAt: input.recordedAt ?? new Date()
    });

    return ping;
};

const getLatestLocation = async (rideId: string, decoded: JwtPayload) => {
    await assertCanSubscribeToRide(rideId, decoded);

    const latest = await LocationPing
        .findOne({ ride: rideId })
        .sort({ recordedAt: -1 });

    if (!latest) throw new AppError(404, "No location available for this ride yet");

    return latest;
};

const getRidePath = async (
    rideId: string,
    decoded: JwtPayload,
    query: { from?: string; to?: string; limit?: string }
) => {
    await assertCanSubscribeToRide(rideId, decoded);

    const filter: Record<string, any> = { ride: rideId };

    if (query.from || query.to) {
        filter.recordedAt = {};
        if (query.from) filter.recordedAt.$gte = new Date(query.from);
        if (query.to) filter.recordedAt.$lte = new Date(query.to);
    }

    const limit = Math.min(Number(query.limit) || 1000, 5000);

    const pings = await LocationPing
        .find(filter)
        .sort({ recordedAt: 1 })
        .limit(limit);

    return pings;
};

export const TrackingServices = {
    savePing,
    getLatestLocation,
    getRidePath,
    assertCanSubscribeToRide,
    assertDriverOwnsRide
};
