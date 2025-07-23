"use client";
import ChatInput from "@/components/chatBar";
import { PureMessage } from "@/components/messages";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useChat } from "@ai-sdk/react";
import { Chat } from "@/components/chat";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";

export default async function ChatPage(props: {
  params: Promise<{ chatId: string }>;
}) {

  const { chatId } = await props.params;

  const chat = await getChatById(chatId);
  const { session, isPending } = useRequireAuth();
  if (isPending) {
    return <div>Loading...</div>;
  }
  if (!session) {
    return null;
  }

  //get messages by chat id
  const initialMessages = await getMessagesByChatId(chatId)
  return (
    <>
      <Chat id={chatId} initialMessages={initialMessages}></Chat>
    </>
  );
}
