import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { fetchWithErrorHandlers } from "@/lib/utils";

interface BackendChatConfig {
  userId: string;
  model: string;
  apiEndpoint?: string; // Optional, defaults to '/api/chat'
}

interface BackendChatCallbacks {
  onStreamData?: (dataPart: any) => void;
  onStreamFinish?: () => void;
  onStreamError?: (error: Error) => void;
}

export function useBackendChat(config: BackendChatConfig) {
  return function useStreamingChat(
    chatId: string,
    callbacks?: BackendChatCallbacks
  ) {
    const { userId, model, apiEndpoint = "/api/chat" } = config;

    const { sendMessage, status, stop, regenerate, resumeStream } = useChat({
      id: chatId,
      messages: [], // Empty array since we're not using message state
      experimental_throttle: 100,
      generateId: () => "temp-id",
      transport: new DefaultChatTransport({
        api: apiEndpoint,
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest({ messages, id, body }) {
          // Get the latest user message
          const latestMessage = messages.at(-1);

          // Extract text content from message parts
          const prompt =
            latestMessage?.parts
              ?.filter((part) => part.type === "text")
              ?.map((part) => part.text)
              ?.join(" ") || "";

          // Transform to your backend's expected format
          return {
            body: {
              userId: userId,
              prompt: prompt,
              model: model,
              chatId: id,
            },
          };
        },
      }),
      onData: (dataPart) => {
        console.log("Streaming data received:", dataPart);
        callbacks?.onStreamData?.(dataPart);
      },
      onFinish: () => {
        console.log("Stream finished");
        callbacks?.onStreamFinish?.();
      },
      onError: (error) => {
        console.error("Stream error:", error);
        callbacks?.onStreamError?.(error);
      },
    });

    // Helper function to send a simple text message
    const sendTextMessage = (text: string) => {
      sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
    };

    return {
      // Streaming controls
      sendMessage,
      sendTextMessage,
      status,
      stop,
      regenerate,
      resumeStream,
      chatId,

      // Status helpers
      isStreaming: status === "streaming",
      isReady: status === "ready",
      isError: status === "error",
      isSubmitted: status === "submitted",
    };
  };
}
