import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SignedIn, RedirectToSignIn } from '@neondatabase/auth-ui';

function AuthenticatedLayout() {
	return (
		<>
			<SignedIn>
				<SidebarProvider defaultOpen={false} >
					<AppSidebar />
					<SidebarInset className="min-w-0">
						<header className="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
							<div className="flex items-center gap-2 px-4">
								<SidebarTrigger className="-ml-1" />
							</div>
						</header>
						<Outlet />
					</SidebarInset>
				</SidebarProvider>
			</SignedIn>
			<RedirectToSignIn />
		</>
	)
}

export const Route = createFileRoute('/_authenticated')({
	component: AuthenticatedLayout,
})

