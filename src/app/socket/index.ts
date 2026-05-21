/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { JwtPayload } from "jsonwebtoken";
import { verifyToken } from "../utils/jwt";
import { envVars } from "../config/env";
import { Role } from "../modules/user/user.interface";
import { TrackingServices } from "../modules/tracking/tracking.service";
import { locationPingZodSchema } from "../modules/tracking/tracking.validation";

let io: IOServer | null = null;

const rideRoom = (rideId: string) => `ride:${rideId}`;

const extractToken = (socket: Socket): string | undefined => {
    const auth = socket.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token.replace(/^Bearer\s+/i, "");

    const header = socket.handshake.headers.authorization;
    if (header) return header.replace(/^Bearer\s+/i, "");

    return undefined;
};

export const initSocket = (httpServer: HttpServer): IOServer => {
    io = new IOServer(httpServer, {
        cors: {
            origin: [envVars.FRONTEND_URL, "http://localhost:3000"],
            credentials: true
        }
    });

    io.use((socket, next) => {
        try {
            const token = extractToken(socket);
            if (!token) return next(new Error("UNAUTHORIZED: missing token"));

            const decoded = verifyToken(token, envVars.JWT_ACCESS_SECRET) as JwtPayload;
            (socket.data as any).user = decoded;
            next();
        } catch {
            next(new Error("UNAUTHORIZED: invalid token"));
        }
    });

    io.on("connection", (socket) => {
        const user = (socket.data as any).user as JwtPayload;

        socket.on("tracking:join", async (payload: { rideId?: string }, ack?: (res: any) => void) => {
            try {
                if (!payload?.rideId) throw new Error("rideId required");
                await TrackingServices.assertCanSubscribeToRide(payload.rideId, user);
                await socket.join(rideRoom(payload.rideId));
                ack?.({ ok: true });
            } catch (err: any) {
                ack?.({ ok: false, error: err?.message || "join failed" });
            }
        });

        socket.on("tracking:leave", async (payload: { rideId?: string }, ack?: (res: any) => void) => {
            try {
                if (!payload?.rideId) throw new Error("rideId required");
                await socket.leave(rideRoom(payload.rideId));
                ack?.({ ok: true });
            } catch (err: any) {
                ack?.({ ok: false, error: err?.message || "leave failed" });
            }
        });

        socket.on("tracking:location", async (payload: any, ack?: (res: any) => void) => {
            try {
                if (user.role !== Role.DRIVER) {
                    throw new Error("Only drivers can publish location");
                }

                const input = locationPingZodSchema.parse(payload);
                const ping = await TrackingServices.savePing(input, user);

                io?.to(rideRoom(input.rideId)).emit("tracking:update", {
                    rideId: input.rideId,
                    lat: input.lat,
                    lng: input.lng,
                    speed: input.speed,
                    heading: input.heading,
                    accuracy: input.accuracy,
                    recordedAt: ping.recordedAt
                });

                ack?.({ ok: true });
            } catch (err: any) {
                ack?.({ ok: false, error: err?.message || "publish failed" });
            }
        });
    });

    return io;
};

export const getIO = (): IOServer => {
    if (!io) throw new Error("Socket.IO not initialized");
    return io;
};
