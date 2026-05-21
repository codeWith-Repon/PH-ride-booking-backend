import z from "zod";

export const findCandidatesZodSchema = z.object({
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
    maxRadiusKm: z.number().positive().max(50).optional(),
    limit: z.number().int().positive().max(20).optional(),
    maxStaleSeconds: z.number().int().positive().max(3600).optional()
});

export type FindCandidatesInput = z.infer<typeof findCandidatesZodSchema>;
