import { Response } from "express";
import { envVars } from "../config/env";


export interface AuthTokens {
    accessToken?: string,
    refreshToken?: string
}

const isProd = envVars.NODE_ENV === "production"

export const setAuthCookie = (res: Response, tokenInfo: AuthTokens) => {

    if (tokenInfo.accessToken) {
        res.cookie("accessToken", tokenInfo.accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
        })
    }

    if (tokenInfo.refreshToken) {
        res.cookie("refreshToken", tokenInfo.refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
    }
}