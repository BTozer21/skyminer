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
import { Building2, Home, Calendars, Users, Parasol, ListTodo } from "lucide-react"
import skyminerIcon from "@/assets/skyminer-192.png";
import { authClient, useIsAdmin } from "@/auth";

// `admin` gates who sees the item: true for admins only, false for non-admins
// only, omitted for everyone. Typed rather than inferred so the optional keys
// survive on every item in the array.
type NavItem = {
  title: string
  url: string
  icon?: React.ReactNode
  isActive?: boolean
  admin?: boolean
  items?: { title: string; url: string; admin?: boolean }[]
}

const data: { navMain: NavItem[] } = {
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: <Home />,
      isActive: true,
      // Admins are redirected off "/" to the schedule, so the link would be a
      // dead end for them.
      admin: false,
    },
    {
      title: "Leave Requests",
      url: "/leave-requests",
      icon: <Parasol />,
      isActive: true,
      // Admins are redirected off "/" to the schedule, so the link would be a
      // dead end for them.
      admin: false,
    },
    {
      title: "Schedule",
      url: "/admin",
      icon: <Calendars />,
      admin: true,
    },
    {
      title: "Jobs",
      url: "/admin/jobs",
      icon: <ListTodo />,
      admin: true,
    },
    {
      title: "Customers",
      url: "/admin/customers",
      icon: <Building2 />,
      admin: true,
    },
    {
      title: "Team",
      url: "/admin/team",
      icon: <Users />,
      admin: true,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAdmin } = useIsAdmin();
  const { data: session } = authClient.useSession();
  // undefined means "no opinion", so only compare when the flag is set.
  const visible = (item: { admin?: boolean }) => item.admin === undefined || item.admin === isAdmin;
  const navMain = data.navMain
    .filter(visible)
    .map((item) => (item.items ? { ...item, items: item.items.filter(visible) } : item));

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
        {/* The session is undefined on the first render, so the row renders
            empty rather than flashing someone else's details. */}
        <NavUser user={session?.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
