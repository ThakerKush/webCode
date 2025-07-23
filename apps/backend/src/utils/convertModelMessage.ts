// convert the messages in db to model message type

import * as schema from "@repo/db/schema";
import {
  type AssistantModelMessage,
  type FilePart,
  type ImagePart,
  type ModelMessage,
  type TextPart,
  type ToolCallPart,
  type ToolResultPart,
  type UserModelMessage,
} from "ai";

// For now this is it, don't konw what'll happen later 

export function convertModelMessage(message: schema.Message[]): ModelMessage[] {
  return message.map((message) => {
    const modelMessage: ModelMessage = {
      role: message.role as "user" | "system" | "assistant" | "tool",
      content: message.parts as any,
    };
    return modelMessage;
  });
}
