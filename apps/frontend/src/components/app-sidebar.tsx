"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarHistory } from "./sidebar-chat-history";
import { SidebarUserNav } from "./sidebar-user";

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader />
      <SidebarContent>
        <SidebarHistory />
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <SidebarUserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
