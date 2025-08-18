"use client";
import { AppChatInput } from "@/components/app-chat-input";
import { useRouter } from "next/navigation";

const quotes = [
  "What will you cook today?",
  "Ready to explore something new?",
  "What's on your mind?",
  "How can I help you today?",
  "What would you like to learn?",
];

export default function ChatPage() {
  const router = useRouter();
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  const handleChatCreated = (chatId: string) => {
    // Navigate to the new chat page
    router.push(`/chat/${chatId}`);
  };

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
