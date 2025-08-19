import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "codeAgent/types/chat";
import type { ArtifactKind } from "./artifact";

interface ToolbarProps {
  isToolbarVisible: boolean;
  setIsToolbarVisible: (visible: boolean) => void;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  artifactKind: ArtifactKind;
}

export function Toolbar({
  isToolbarVisible,
  setIsToolbarVisible,
  sendMessage,
  status,
  stop,
  artifactKind,
}: ToolbarProps) {
  const handleQuickAction = (action: string) => {
    // Handle quick actions for the artifact
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: `Please ${action} this ${artifactKind}.` }],
    });
  };

  if (!isToolbarVisible) {
    return (
      <motion.div
        className="fixed bottom-4 right-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        <Button
          onClick={() => setIsToolbarVisible(true)}
          className="rounded-full h-12 w-12 p-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed bottom-4 right-4 bg-background border border-border rounded-lg p-4 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Quick Actions</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsToolbarVisible(false)}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickAction("improve")}
          disabled={Boolean(
            status &&
              !["idle", "awaiting_message", null, undefined].includes(
                status as any
              )
          )}
        >
          Improve
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickAction("explain")}
          disabled={Boolean(
            status &&
              !["idle", "awaiting_message", null, undefined].includes(
                status as any
              )
          )}
        >
          Explain
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickAction("debug")}
          disabled={Boolean(
            status &&
              !["idle", "awaiting_message", null, undefined].includes(
                status as any
              )
          )}
        >
          Debug
        </Button>
      </div>
    </motion.div>
  );
}
