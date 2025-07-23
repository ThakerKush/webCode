import { z } from "zod";

export const postRequestBodySchema = z.object({
    prompt: z.string() 
})

export type postRequestBody = z.infer<typeof postRequestBodySchema> 