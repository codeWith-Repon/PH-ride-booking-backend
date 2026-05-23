/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebSocket } from "ws";
import { Ride } from "../modules/ride/ride.model";
import { Driver } from "../modules/driver/driver.model";
import { wsRegistry } from "./ws.registry";

const safeSend = (ws: WebSocket, payload: unknown): void => {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
        ws.send(JSON.stringify(payload));
    } catch {
        // socket may have closed mid-send
    }
};

const toUser = (userId: string, payload: unknown): void => {
    const set = wsRegistry.get(userId);
    if (!set) return;
    set.forEach(ws => safeSend(ws, payload));
};

const toUsers = (userIds: string[], payload: unknown): void => {
    userIds.forEach(id => toUser(id, payload));
};

const toRideParticipants = async (rideId: string, payload: unknown): Promise<void> => {
    const ride = await Ride.findById(rideId).select("user driver");
    if (!ride) return;

    const targets: string[] = [ride.user.toString()];
    if (ride.driver) {
        const driver = await Driver.findById(ride.driver).select("user");
        if (driver) targets.push(driver.user.toString());
    }
    toUsers(targets, payload);
};

export const wsBroadcast = { toUser, toUsers, toRideParticipants };
