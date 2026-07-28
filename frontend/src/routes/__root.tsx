import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';

import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { NeonAuthUIProvider } from '@neondatabase/auth-ui';
import { useNavigate, Link as RouterLink } from '@tanstack/react-router';
import { authClient } from '../auth';

import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const navigate = useNavigate();
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <NeonAuthUIProvider
        authClient={authClient}
        navigate={(href: string) => navigate({ to: href })}
        replace={(href: string) => navigate({ to: href, replace: true })}
        Link={RouterLink}
      >
        <TooltipProvider>
          <Outlet />
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'TanStack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </TooltipProvider>
      </NeonAuthUIProvider>
    </ThemeProvider>
  )
}
