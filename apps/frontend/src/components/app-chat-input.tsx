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
import { useChat } from "@ai-sdk/react";
import { useBackendChat } from "@/hooks/user-backend-chat";

const models = [
  { id: "openRouter:google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "generic test", name: "generic testing" },
];

export const AppChatInput = () => {
  const { data: session, isPending } = useSession();
  const [text, setText] = useState<string>("");
  const [model, setModel] = useState<string>(models[0].id);


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user.id) {
      toast.error("Please login to send a message");
      return;
    }

    // TODO: Add model selector here
    const response = await fetch(`${config.backend.url}/chat`, {
      method: "POST",
      body: JSON.stringify({
        userId: session?.user.id,
        prompt: text,
        model: model,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      toast.error("Failed to send message");
    }
    setText("");
  };
  return (
    <PromptInput onSubmit={handleSubmit} className="mt-4">
      <PromptInputTextarea
        onChange={(e) => setText(e.target.value)}
        value={text}
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
        <PromptInputSubmit disabled={!text} status={status} />
      </PromptInputToolbar>
    </PromptInput>
  );
};
