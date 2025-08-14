"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { SidebarMenuAction, SidebarMenuButton } from "@/components/ui/sidebar";
import type { Chat } from "@/lib/db/schema";

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}

export function ChatItem({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: ChatItemProps) {
  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      onClick={() => setOpenMobile(false)}
    >
      <div className="flex items-center justify-between w-full">
        <a href={`/chat/${chat.id}`} className="flex-1 flex items-center">
          <MessageSquare className="h-4 w-4 mr-2" />
          <span className="truncate">{chat.title}</span>
        </a>
        <SidebarMenuAction
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(String(chat.id));
          }}
        >
          <Trash2 className="h-4 w-4" />
        </SidebarMenuAction>
      </div>
    </SidebarMenuButton>
  );
}
