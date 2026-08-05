"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main";
import { NavAdmin } from "@/components/nav-admin";
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Home, AudioLinesIcon, TerminalIcon, TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon, Calendars, ShieldIcon } from "lucide-react";
import skyminerIcon from "@/assets/skyminer-192.png";
import { useIsAdmin } from "@/auth";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: (
        <Home
        />
      ),
      isActive: true,
    },
    {
      title: "Calendar",
      url: "/calendar",
      icon: (
        <Calendars
        />
      ),
      isActive: true,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: (
        <Settings2Icon
        />
      ),
    },
  ],
  navAdmin: [
    {
      title: "Admin",
      url: "/admin",
      icon: (
        <ShieldIcon
        />
      ),
      adminOnly: true,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAdmin } = useIsAdmin();
  // Drop admin-only entries (top-level and sub-items) for non-admins.
  // Hiding is UX only — the backend still enforces the role on every request.
  const navMain = data.navMain
    .filter((item) => !("adminOnly" in item && item.adminOnly) || isAdmin)
    .map((item) =>
      item.items
        ? { ...item, items: item.items.filter((sub) => !("adminOnly" in sub && sub.adminOnly) || isAdmin) }
        : item
    );
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent active:bg-transparent">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                <img src={skyminerIcon} alt="Skyminers" className="size-8 rounded-lg" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Skyminers</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        { isAdmin && 
          <NavAdmin items={data.navAdmin} />
        }
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
