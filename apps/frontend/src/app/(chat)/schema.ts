import { z } from "zod";
import type { ChatMessage } from "codeAgent/types/chat";

export const chatInfoSchema = z.object({
  messages: z.array(z.custom<ChatMessage>()),
  chat: z.any(),
  project: z.any(),
});

export type ChatInfo = z.infer<typeof chatInfoSchema>;
