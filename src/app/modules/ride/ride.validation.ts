import z from "zod";
import { RIDE_STATUS } from "./ride.interface";
import { PAYMENT_METHOD } from "../payment/payment.interface";

export const createRideZodSchema = z.object({
    // user: z.string(),
    driver: z.string().optional(),
    pickupLocation: z.string(),
    pickupCoordinates: z.object({
        lat: z.number().gte(-90).lte(90),
        lng: z.number().gte(-180).lte(180)
    }).optional(),
    dropLocation: z.string(),
    distance: z.number().positive().optional(),
    paymentMethod: z.enum(Object.values(PAYMENT_METHOD)),
})

export const updateRideZodSchema = z.object({
    user: z.string().optional(),
    driver: z.string().optional(),
    pickupLocation: z.string().optional(),
    dropLocation: z.string().optional(),
    distance: z.number().optional(),
    rideStatus: z
        .enum(Object.values(RIDE_STATUS) as [string])
        .optional(),
    fare: z.number().positive().optional(),
    payment: z.string().optional(),
    rideOtp: z
        .number()
        .int()
        .min(100000)
        .max(999999)
        .optional(), // 6-digit OTP
    isOtpVerified: z.boolean().optional(),
    startedAt: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
            message: "Invalid date format. Use ISO format"
        })
        .optional(),
    completedAt: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
            message: "Invalid date format. Use ISO format"
        })
        .optional()
});

export const updateRideStatusZodSchema = z.object({
    rideStatus: z.enum(RIDE_STATUS).optional()
})