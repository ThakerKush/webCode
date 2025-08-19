import { memo } from "react";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import type { ChatMessage } from "codeAgent/types/chat";

interface MessageProps {
  chatId: string;
  message: ChatMessage;
  isLoading: boolean;
}

function PureMessage({ chatId, message, isLoading }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("w-full mx-auto max-w-3xl px-4 group/message")}>
      <div
        className={cn(
          "flex w-full gap-4 rounded-xl",
          !isUser && "bg-muted/25 px-5 py-4"
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          {isUser ? "U" : "AI"}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 w-full">
            {message.parts?.map((part, index) => {
              if (part.type === "text") {
                return (
                  <div key={index} className="flex flex-col gap-4">
                    <Markdown>{part.text}</Markdown>
                  </div>
                );
              }

              // Handle tool calls
              if (part.type?.startsWith("tool-")) {
                return (
                  <div
                    key={index}
                    className="rounded-lg border bg-muted/50 p-4"
                  >
                    <div className="font-medium text-sm mb-2">
                      Tool: {part.type.replace("tool-", "")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {JSON.stringify(part, null, 2)}
                    </div>
                  </div>
                );
              }

              // Handle data streams
              if (part.type?.startsWith("data-")) {
                return (
                  <div
                    key={index}
                    className="rounded-lg border bg-muted/50 p-4"
                  >
                    <div className="font-medium text-sm mb-2">
                      Data: {part.type.replace("data-", "")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {part.type === "data-codeDelta" && (part as any).data ? (
                        <div>
                          <div className="font-medium">
                            File: {(part as any).data.path}
                          </div>
                          <pre className="mt-2 whitespace-pre-wrap text-xs">
                            {(part as any).data.content}
                          </pre>
                        </div>
                      ) : (
                        JSON.stringify((part as any).data || part, null, 2)
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={index} className="rounded-lg border bg-muted/50 p-4">
                  <div className="text-sm text-muted-foreground">
                    {JSON.stringify(part, null, 2)}
                  </div>
                </div>
              );
            })}
          </div>

          {!isUser && (
            <div className="flex flex-row justify-between">
              <div className="flex flex-row gap-2">
                <MessageActions
                  chatId={chatId}
                  message={message}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const Message = memo(PureMessage, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.parts?.length !== nextProps.message.parts?.length)
    return false;
  return true;
});

// Also export a ThinkingMessage for compatibility
export const ThinkingMessage = memo(({ message }: { message: ChatMessage }) => {
  return (
    <div className="w-full mx-auto max-w-3xl px-4">
      <div className="flex w-full gap-4 rounded-xl bg-muted/25 px-5 py-4">
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          AI
        </div>
        <div className="flex flex-col gap-2 w-full">
          <div className="text-sm text-muted-foreground">Thinking...</div>
        </div>
      </div>
    </div>
  );
});

// Export PreviewMessage for compatibility with artifact-messages
export const PreviewMessage = Message;
