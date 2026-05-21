import z from "zod";

export const locationPingZodSchema = z.object({
    rideId: z.string().min(1),
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
    speed: z.number().nonnegative().optional(),
    heading: z.number().gte(0).lte(360).optional(),
    accuracy: z.number().nonnegative().optional(),
    recordedAt: z.coerce.date().optional()
});

export type LocationPingInput = z.infer<typeof locationPingZodSchema>;
