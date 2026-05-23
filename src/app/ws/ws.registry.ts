import { WebSocket } from "ws";

/**
 * In-memory map of userId → set of open sockets.
 * A single user may have multiple connections (multiple tabs / devices).
 * For a multi-instance deployment this needs a Redis pub/sub layer in front.
 */
const sockets = new Map<string, Set<WebSocket>>();

const add = (userId: string, ws: WebSocket): void => {
    let set = sockets.get(userId);
    if (!set) {
        set = new Set();
        sockets.set(userId, set);
    }
    set.add(ws);
};

const remove = (userId: string, ws: WebSocket): void => {
    const set = sockets.get(userId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) sockets.delete(userId);
};

const get = (userId: string): Set<WebSocket> | undefined => sockets.get(userId);

const isOnline = (userId: string): boolean => {
    const set = sockets.get(userId);
    return !!set && set.size > 0;
};

export const wsRegistry = { add, remove, get, isOnline };
