"use client";
import { AppChatInput } from "@/components/app-chat-input";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

const quotes = [
  "What will you cook today?",
  "Ready to explore something new?",
  "What's on your mind?",
  "How can I help you today?",
  "What would you like to learn?",
];

export default function ChatPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  const handleChatCreated = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  if (!session?.user) {
    return (
      <div className="flex flex-col h-full justify-center items-center px-4">
        <div className="text-center">
          <p className="text-xl font-medium text-foreground">
            Please log in to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full justify-center items-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <p className="text-xl font-medium text-foreground">{randomQuote}</p>
        </div>

        <AppChatInput isCreateMode={true} onChatCreated={handleChatCreated} />
      </div>
    </div>
  );
}
