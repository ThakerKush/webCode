import { useState, useEffect } from "react";
import { ChatMessage, CustomUIDataTypes } from "codeAgent/types/chat";
import { useSWRConfig } from "swr";
import { useDataStream } from "./data-stream-provider";
import { useChat } from "@ai-sdk/react";
import { DataUIPart, DefaultChatTransport } from "ai";
import { useSession } from "@/lib/auth-client";
import { ChatSDKError } from "@/lib/errors";
import { toast } from "sonner";
import { useArtifactStream } from "@/hooks/use-artifact-stream";
import { useArtifact } from "@/hooks/use-artifacts";
import { Artifact } from "./artifact";
import { Messages } from "./messages";
import { AppChatInput } from "./app-chat-input";
import { useMessages } from "@/hooks/use-messages";

export function Chat({
  id,
  initialMessages,
  model,
}: {
  id: string;
  initialMessages: ChatMessage[];
  model: string;
}) {
  const { data: session, isPending } = useSession();
  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();
  const { artifact } = useArtifact();
  const [loadedMessages, setLoadedMessages] =
    useState<ChatMessage[]>(initialMessages);

  // Process streaming data for artifacts
  useArtifactStream();

  const [input, setInput] = useState("");

  const { messages, setMessages, sendMessage, status, stop, regenerate } =
    useChat<ChatMessage>({
      messages: loadedMessages,
      transport: new DefaultChatTransport({
        api: `api/chat`,
        prepareSendMessagesRequest({ messages, messageId, body }) {
          return {
            body: {
              chatId: id,
              messageId: messageId,
              userId: Number(session?.user.id),
              message: messages.at(-1),
              modelProvider: model.split(":")[0],
              model: model.split(":")[1],
            },
          };
        },
      }),
      onData: (dataPart) => {
        setDataStream(
          (ds) =>
            (ds ? [...ds, dataPart] : []) as DataUIPart<CustomUIDataTypes>[]
        );
      },
      onError: (error) => {
        if (error instanceof ChatSDKError) {
          toast.error(error.message);
        }
      },
    });

  const { containerRef, endRef, scrollToBottom, isAtBottom, hasSentMessage } =
    useMessages({
      chatId: id,
      status,
    });

  // Load existing messages for this chat
  useEffect(() => {
    if (id && id !== "new") {
      fetch(`/api/chat/${id}/messages`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages) {
            setLoadedMessages(data.messages);
            setMessages(data.messages);
          }
        })
        .catch((error) => {
          console.error("Failed to load chat messages:", error);
        });
    }
  }, [id, setMessages]);

  // Auto-scroll behavior
  useEffect(() => {
    if (hasSentMessage && status === "streaming") {
      scrollToBottom("smooth");
    }
  }, [hasSentMessage, status, scrollToBottom]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages area */}
        <div ref={containerRef} className="flex-1 overflow-y-auto">
          <Messages messages={messages} />
          <div ref={endRef} />
        </div>

        {/* Input area - fixed at bottom */}
        <div className="flex-shrink-0 border-t bg-background">
          <div className="p-4">
            <AppChatInput
              chatId={id}
              initialMessages={loadedMessages}
              isCreateMode={false}
              onChatCreated={() => {}}
            />
          </div>
        </div>
      </div>

      {artifact.isVisible && (
        <Artifact
          chatId={id}
          input={input}
          setInput={setInput}
          status={status}
          stop={stop}
          sendMessage={sendMessage}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={false}
        />
      )}
    </div>
  );
}
