import z from "zod";
import { VehicleType } from "./vehicle.interface";

export const createVehicleZodSchema = z.object({
    // driver: z.string(),
    vehicleType: z
        .enum(Object.values(VehicleType) as string[], { message: "Invalid vehicle type" }),
    brand: z
        .string()
        .min(2, "Brand must be at least 2 characters")
        .max(50, "Brand must not exceed 50 characters"),
    model: z
        .string()
        .min(1, "Model is required")
        .max(50, "Model must not exceed 50 characters"),
    vehicleLicense: z
        .string()
        .min(5, "Vehicle License must be at least 5 characters")
        .max(15, "Vehicle License must not exceed 15 characters"),
})


export const updateVehicleZodSchema = z.object({
    driver: z.string().optional(),
    vehicleType: z.enum(Object.values(VehicleType) as string[], { message: "Invalid vehicle type" }).optional(),
    brand: z
        .string()
        .min(2, "Brand must be at least 2 characters")
        .max(50, "Brand must not exceed 50 characters").optional(),
    model: z
        .string()
        .min(1, "Model is required")
        .max(50, "Model must not exceed 50 characters").optional(),
    image: z
        .array(z.string()).optional(),
    vehicleLicense: z
        .string()
        .min(5, "Vehicle License must be at least 5 characters")
        .max(15, "Vehicle License must not exceed 15 characters")
        .optional(),
    isDeleted: z
        .boolean()
        .optional()
})

