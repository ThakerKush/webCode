"use client";
import { Chat } from "@/components/chat";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { useSession } from "@/lib/auth-client";
import React from "react";

interface PageProps {
  params: {
    id: string;
  };
}

export default function ChatPage({ params }: PageProps) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  return (
    <DataStreamProvider>
      <div className="h-[calc(100vh-3rem)]">
        {" "}
        {/* Account for sidebar trigger */}
        <Chat
          id={params.id}
          initialMessages={[]}
          model="openai:gpt-4o-mini"
        />
      </div>
    </DataStreamProvider>
  );
}
