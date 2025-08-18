"use client";
import DockerIDE from "@/components/ide";
import config from "@/config";
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
  console.log("id", params.id);
  console.log("userId", session?.user.id);
  return (
    <DockerIDE
      containerId={params.id}
      wsUrl={config.backend.wsUrl}
      userId={Number(session?.user.id)}
    />
  );
}
