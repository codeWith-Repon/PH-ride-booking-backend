import z from "zod";

export const sendMessageZodSchema = z.object({
    text: z
        .string()
        .min(1, "Message cannot be empty")
        .max(2000, "Message is too long")
});

export type SendMessageInput = z.infer<typeof sendMessageZodSchema>;
