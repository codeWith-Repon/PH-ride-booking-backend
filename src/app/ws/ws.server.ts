/* eslint-disable no-console */
import { Server as HttpServer, IncomingMessage } from "http";
import { Server as WSServer, WebSocket } from "ws";
import { authenticateWsUpgrade, WsAuthResult } from "./ws.auth";
import { wsRegistry } from "./ws.registry";
import { handleClientMessage } from "./ws.handlers";

const HEARTBEAT_INTERVAL_MS = 30_000;

interface AliveSocket extends WebSocket {
    isAlive: boolean;
    userId: string;
}

export const attachWebSocketServer = (httpServer: HttpServer): WSServer => {
    const wss = new WSServer({ noServer: true });

    httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
        const url = req.url ?? "";
        if (!url.startsWith("/ws")) {
            socket.destroy();
            return;
        }

        const auth = authenticateWsUpgrade(req);
        if (!auth) {
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
        }

        wss.handleUpgrade(req, socket, head, ws => {
            wss.emit("connection", ws, req, auth);
        });
    });

    wss.on("connection", (ws: WebSocket, _req: IncomingMessage, auth: WsAuthResult) => {
        const socket = ws as AliveSocket;
        socket.isAlive = true;
        socket.userId = auth.userId;

        wsRegistry.add(auth.userId, ws);

        ws.send(
            JSON.stringify({
                type: "connected",
                userId: auth.userId,
                role: auth.role
            })
        );

        ws.on("pong", () => {
            socket.isAlive = true;
        });

        ws.on("message", raw => {
            handleClientMessage(ws, { userId: auth.userId, role: auth.role }, raw.toString());
        });

        ws.on("close", () => {
            wsRegistry.remove(auth.userId, ws);
        });

        ws.on("error", err => {
            console.error("🔴 WS error:", err.message);
        });
    });

    const heartbeat = setInterval(() => {
        wss.clients.forEach(client => {
            const s = client as AliveSocket;
            if (!s.isAlive) {
                s.terminate();
                return;
            }
            s.isAlive = false;
            try {
                s.ping();
            } catch {
                // ignore
            }
        });
    }, HEARTBEAT_INTERVAL_MS);

    wss.on("close", () => clearInterval(heartbeat));

    console.log("✅ WebSocket server attached at path /ws");
    return wss;
};
