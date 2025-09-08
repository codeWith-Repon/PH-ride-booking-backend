import z from "zod";
import { SOS_STATUS } from "./sos.interface";


export const addEmergencyContactZodSchema = z.object({
    emergencyContactEmail: z.email()
})


export const updateSosStatusZodSchema = z.object({
    status: z.enum(Object.values(SOS_STATUS) as [string])
})