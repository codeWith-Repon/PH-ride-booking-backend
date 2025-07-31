import z from "zod";


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
    isApproved: z
        .boolean()
        .optional(),
    isAvailable: z
        .boolean()
        .optional()
})