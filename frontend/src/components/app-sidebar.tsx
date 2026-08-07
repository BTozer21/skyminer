import * as React from "react"

import { NavMain } from "@/components/nav-main"
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
import { Building2, Home, Calendars, Users, ListTodo } from "lucide-react"
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
      icon: <Home />,
      isActive: true,
    },
    {
      title: "Schedule",
      url: "/admin",
      icon: <Calendars />,
      adminOnly: true,
    },
    {
      title: "Jobs",
      url: "/admin/jobs",
      icon: <ListTodo />,
      adminOnly: true,
    },
    {
      title: "Clients",
      url: "/admin/clients",
      icon: <Building2 />,
      adminOnly: true,
    },
    {
      title: "Team",
      url: "/admin/team",
      icon: <Users />,
      adminOnly: true,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAdmin } = useIsAdmin();
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
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
