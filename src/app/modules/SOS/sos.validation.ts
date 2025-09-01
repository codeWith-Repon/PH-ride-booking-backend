import z from "zod";


export const addEmergencyContactZodSchema = z.object({
    emergencyContactEmail: z.email()
})


export const sendSosMessageZodSchema = z.object({
    location: z.string().optional(),
    message: z.string().optional(),
})