'use client';

import { Plus } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

export function SidebarHeader() {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      <div className="flex flex-row justify-between items-center">
        <Link
          href="/"
          onClick={() => {
            setOpenMobile(false);
          }}
          className="flex flex-row gap-3 items-center"
        >
          <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
            Chatbot
          </span>
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              type="button"
              className="p-2 h-fit"
              onClick={() => {
                setOpenMobile(false);
                router.push('/');
                router.refresh();
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent align="end">New Chat</TooltipContent>
        </Tooltip>
      </div>
    </SidebarMenu>
  );
}