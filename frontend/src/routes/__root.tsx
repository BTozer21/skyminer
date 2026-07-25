import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip';

import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { NeonAuthUIProvider } from '@neondatabase/auth-ui';
import { authClient } from '../auth';

import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <NeonAuthUIProvider authClient={authClient}>
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
  )
}
