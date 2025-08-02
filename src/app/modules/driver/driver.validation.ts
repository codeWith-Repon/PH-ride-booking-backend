import z from "zod";
import { AVAILABILITY_STATUS, DRIVER_STATUS } from "./driver.interface";


export const createDriverZodSchema = z.object({
    user: z.string(),
    vehicle: z.string(),
    licenseNumber: z
        .string()
        .min(5, "License number must be at least 5 characters")
        .max(20, "License number must not exceed 10 characters"),
    experience: z
        .number()
        .min(0, "Experience cannot be negative")
        .max(30, "Experience seems too high"),
})

export const updateDriverZodSchema = z.object({
    user: z.string().optional(),
    vehicle: z.string().optional(),
    licenseNumber: z
        .string()
        .min(5, "License number must be at least 5 characters")
        .max(20, "License number must not exceed 10 characters")
        .optional(),
    experience: z
        .number()
        .min(0, "Experience cannot be negative")
        .max(30, "Experience seems too high")
        .optional(),
    status: z
        .enum(Object.values(DRIVER_STATUS))
        .optional(),
    availabilityStatus: z
        .enum(Object.values(AVAILABILITY_STATUS) as string[])
        .optional()
})