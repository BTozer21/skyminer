import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { authClient } from '../auth';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { ModeToggle } from '@/components/mode-toggle.tsx';
import { NotificationsDrawer } from '@/components/notifications-drawer';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { useIsAdmin } from '@/auth';

function AuthenticatedLayout() {
  const { isAdmin } = useIsAdmin();

  return (
    // h-svh (not just min-h-svh) so pages can size themselves against the
    // viewport and scroll their own regions instead of the whole page.
    <SidebarProvider defaultOpen={false} className="h-svh">
      <AppSidebar />
      <SidebarInset className="min-w-0 min-h-0">
        <header className="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center justify-between gap-2 px-4">
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <SidebarTrigger className="-ml-1" />
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                Toggle sidebar
                <KbdGroup>
                  <Kbd>{navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl'}</Kbd>
                  <Kbd>B</Kbd>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2">
              {isAdmin ? <NotificationsDrawer /> : null}
              <ModeToggle />
            </div>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: '/login' });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
})
