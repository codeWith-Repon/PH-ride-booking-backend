import rateLimit from "express-rate-limit"

// General API limiter — applied globally
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests, please try again after 15 minutes.",
    },
})

// Strict limiter for auth endpoints (login, register, forgot-password, reset-password)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts, please try again after 15 minutes.",
    },
})

// OTP endpoints — tightest limit to prevent abuse
export const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many OTP requests, please try again after 5 minutes.",
    },
})
