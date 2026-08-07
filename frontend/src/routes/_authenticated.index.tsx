import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient, useIsAdmin } from '../auth';

export const Route = createFileRoute('/_authenticated/')({
  // Admins land on the schedule instead of the personal home page. The mirror
  // of the /admin guard, which sends non-admins here — the two conditions are
  // opposites, so they can't bounce off each other. beforeLoad runs outside
  // React, so we read the session directly instead of using useIsAdmin.
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (data?.user.role?.split(',').includes('admin')) {
      throw redirect({ to: '/admin' });
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const { isAdmin, isPending } = useIsAdmin();

  return (
    <div className="flex flex-col px-5">
      <div className="flex gap-2">
        <p className="font-bold text-xl">Hello there, {session?.user.name}</p>
      </div>
      {!isAdmin && !isPending &&
        <div>
          <p>You are seeing this as a normal user, this is where the calendar with your jobs will go.</p>
        </div>
      }
      {isAdmin && !isPending &&
        <div>
          <p>You are seeing this as an admin user.</p>
        </div>
      }
    </div>
  )
}

