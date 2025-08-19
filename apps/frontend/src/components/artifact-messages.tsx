import { PreviewMessage, ThinkingMessage } from "./message-simple";
import { memo } from "react";
import equal from "fast-deep-equal";
import type { UIArtifact } from "./artifact";
import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { useMessages } from "@/hooks/use-messages";
import type { ChatMessage } from "codeAgent/types/chat";

interface ArtifactMessagesProps {
  chatId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  artifactStatus: UIArtifact["status"];
}

function PureArtifactMessages({
  chatId,
  status,
  messages,
  setMessages,
  regenerate,
  isReadonly,
}: ArtifactMessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({
    chatId,
    status,
  });

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col gap-4 h-full items-center overflow-y-scroll px-4 pt-20"
    >
      {messages.map((message, index) => (
        <PreviewMessage
          chatId={chatId}
          key={message.id}
          message={message}
          isLoading={
            Boolean(
              status &&
                !["idle", "awaiting_message", null, undefined].includes(
                  status as any
                )
            ) && index === messages.length - 1
          }
        />
      ))}

      {Boolean(
        status &&
          !["idle", "awaiting_message", null, undefined].includes(status as any)
      ) &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "user" && (
          <ThinkingMessage message={{} as ChatMessage} />
        )}

      <motion.div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
        onViewportLeave={onViewportLeave}
        onViewportEnter={onViewportEnter}
      />
    </div>
  );
}

function areEqual(
  prevProps: ArtifactMessagesProps,
  nextProps: ArtifactMessagesProps
) {
  if (
    prevProps.artifactStatus === "streaming" &&
    nextProps.artifactStatus === "streaming"
  )
    return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.status && nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;

  return true;
}

export const ArtifactMessages = memo(PureArtifactMessages, areEqual);
