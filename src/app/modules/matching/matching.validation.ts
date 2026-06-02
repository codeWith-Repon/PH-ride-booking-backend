import z from "zod";

export const matchQueryZodSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    maxRadiusKm: z.number().positive().max(50).optional(),
    limit: z.number().int().positive().max(20).optional(),
    maxStaleSeconds: z.number().int().positive().max(3600).optional(),
})
