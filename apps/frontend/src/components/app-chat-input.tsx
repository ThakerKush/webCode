"use client";
import config from "@/config";
import { useSession } from "@/lib/auth-client";
import { useState } from "react";
import { toast } from "sonner";
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { GlobeIcon, MicIcon } from "lucide-react";
import { UIMessage, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const models = [
  { id: "openRouter:google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "generic test", name: "generic testing" },
];

interface AppChatInputProps {
  chatId?: string;
  initialMessages?: UIMessage[];
  isCreateMode?: boolean;
  onChatCreated?: (chatId: string) => void; // Callback when chat is created
  onMessageSent?: (message: string) => void; // Callback when message is sent
}

export const AppChatInput = ({
  chatId,
  initialMessages,
  isCreateMode = false,
  onChatCreated,
  onMessageSent,
}: AppChatInputProps) => {
  const { data: session, isPending } = useSession();
  const [text, setText] = useState<string>("");
  const [model, setModel] = useState<string>(models[0].id);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(
    chatId
  );
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Only use this useChat hook for create mode
  const { sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `api/chat`,
      prepareSendMessagesRequest({ messages, messageId, body }) {
        return {
          body: {
            chatId: currentChatId,
            messageId: messageId,
            userId: Number(session?.user.id),
            message: messages.at(-1),
            modelProvider: model.split(":")[0],
            model: model.split(":")[1],
          },
        };
      },
    }),
  });

  const createNewChat = async (): Promise<string | null> => {
    try {
      const newChatId = crypto.randomUUID();
      const response = await fetch(`/api/chat/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: newChatId,
        }),
      });

      if (response.ok) {
        return newChatId;
      } else {
        toast.error("Failed to create chat");
        return null;
      }
    } catch (error) {
      console.error("Error when creating chat", error);
      toast.error("Failed to create chat session");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!text.trim()) return;

    if (isCreateMode && !currentChatId) {
      setIsCreatingChat(true);

      const newChatId = await createNewChat();

      if (newChatId) {
        setCurrentChatId(newChatId);
        onChatCreated?.(newChatId);
      } else {
        setIsCreatingChat(false);
        return;
      }

      setIsCreatingChat(false);
    }

    // Always use the parent's message handler if available (non-create mode)
    if (onMessageSent && !isCreateMode) {
      onMessageSent(text);
    } else if (isCreateMode) {
      // For create mode, use our own sendMessage
      sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
    }

    setText("");
  };

  const inputStatus = isCreateMode
    ? isCreatingChat
      ? "streaming"
      : status
    : undefined; // For non-create mode, we don't show streaming status from this component

  return (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea
        onChange={(e) => setText(e.target.value)}
        value={text}
        placeholder="Type your message..."
        className="min-h-[48px] resize-none"
      />
      <PromptInputToolbar>
        <PromptInputTools>
          <PromptInputButton>
            <MicIcon size={16} />
          </PromptInputButton>
          <PromptInputButton>
            <GlobeIcon size={16} />
            <span>Search</span>
          </PromptInputButton>
          <PromptInputModelSelect
            onValueChange={(value) => {
              setModel(value);
            }}
            value={model}
          >
            <PromptInputModelSelectTrigger>
              <PromptInputModelSelectValue />
            </PromptInputModelSelectTrigger>
            <PromptInputModelSelectContent>
              {models.map((model) => (
                <PromptInputModelSelectItem key={model.id} value={model.id}>
                  {model.name}
                </PromptInputModelSelectItem>
              ))}
            </PromptInputModelSelectContent>
          </PromptInputModelSelect>
        </PromptInputTools>
        <PromptInputSubmit
          disabled={!text.trim() || isCreatingChat}
          status={inputStatus}
        />
      </PromptInputToolbar>
    </PromptInput>
  );
};
