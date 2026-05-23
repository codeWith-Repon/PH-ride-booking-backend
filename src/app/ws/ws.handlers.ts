/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebSocket } from "ws";
import { MessageServices } from "../modules/message/message.service";
import { wsBroadcast } from "./ws.broadcast";

interface SocketContext {
    userId: string;
    role: string;
}

interface IncomingPayload {
    type?: string;
    rideId?: string;
    text?: string;
}

const send = (ws: WebSocket, payload: unknown): void => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
};

const handleChatSend = async (
    ws: WebSocket,
    ctx: SocketContext,
    data: IncomingPayload
): Promise<void> => {
    if (!data.rideId || !data.text || typeof data.text !== "string") {
        send(ws, { type: "error", message: "rideId and text are required" });
        return;
    }
    if (data.text.length > 2000) {
        send(ws, { type: "error", message: "Message too long" });
        return;
    }

    try {
        const { message, recipientUserId } = await MessageServices.sendMessage(
            data.rideId,
            ctx.userId,
            data.text.trim()
        );
        const payload = { type: "chat:new", rideId: data.rideId, message };
        wsBroadcast.toUser(recipientUserId, payload);
        wsBroadcast.toUser(ctx.userId, payload);
    } catch (err: any) {
        send(ws, { type: "error", message: err?.message ?? "Failed to send message" });
    }
};

const handleChatRead = async (
    ws: WebSocket,
    ctx: SocketContext,
    data: IncomingPayload
): Promise<void> => {
    if (!data.rideId) {
        send(ws, { type: "error", message: "rideId is required" });
        return;
    }
    try {
        const result = await MessageServices.markRideMessagesRead(data.rideId, ctx.userId);
        wsBroadcast.toRideParticipants(data.rideId, {
            type: "chat:read",
            rideId: data.rideId,
            by: ctx.userId,
            readAt: result.readAt
        });
    } catch (err: any) {
        send(ws, { type: "error", message: err?.message ?? "Failed to mark read" });
    }
};

export const handleClientMessage = async (
    ws: WebSocket,
    ctx: SocketContext,
    raw: string
): Promise<void> => {
    let data: IncomingPayload;
    try {
        data = JSON.parse(raw);
    } catch {
        send(ws, { type: "error", message: "Invalid JSON" });
        return;
    }

    switch (data.type) {
        case "ping":
            send(ws, { type: "pong" });
            return;
        case "chat:send":
            await handleChatSend(ws, ctx, data);
            return;
        case "chat:read":
            await handleChatRead(ws, ctx, data);
            return;
        default:
            send(ws, { type: "error", message: `Unknown message type: ${data.type}` });
    }
};
