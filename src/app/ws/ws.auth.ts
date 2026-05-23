import { IncomingMessage } from "http";
import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../config/env";
import { verifyToken } from "../utils/jwt";

const parseCookieHeader = (header?: string): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!header) return out;
    header.split(";").forEach(part => {
        const [k, ...rest] = part.trim().split("=");
        if (!k) return;
        out[k] = decodeURIComponent(rest.join("="));
    });
    return out;
};

/**
 * Extracts a bearer access token from the WS upgrade request.
 * Looks at (in order): ?token= query string, Authorization header, accessToken cookie.
 */
const extractToken = (req: IncomingMessage): string | null => {
    try {
        const url = new URL(req.url ?? "/", "http://localhost");
        const qsToken = url.searchParams.get("token");
        if (qsToken) return qsToken;
    } catch {
        // ignore malformed URL
    }

    const auth = req.headers.authorization;
    if (auth) {
        return auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    }

    const cookies = parseCookieHeader(req.headers.cookie);
    return cookies.accessToken ?? null;
};

export interface WsAuthResult {
    userId: string;
    role: string;
    email: string;
}

export const authenticateWsUpgrade = (req: IncomingMessage): WsAuthResult | null => {
    const token = extractToken(req);
    if (!token) return null;

    try {
        const decoded = verifyToken(token, envVars.JWT_ACCESS_SECRET) as JwtPayload;
        if (!decoded?.userId || !decoded?.role || !decoded?.email) return null;
        return { userId: decoded.userId, role: decoded.role, email: decoded.email };
    } catch {
        return null;
    }
};
