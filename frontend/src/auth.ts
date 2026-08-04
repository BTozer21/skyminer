import { createAuthClient } from '@neondatabase/neon-js/auth'; 
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
  fetchOptions: { credentials: 'include' },
});

// role is a comma-separated list, e.g. "user" or "user,admin"
export function useIsAdmin() {
  const { data: session, isPending } = authClient.useSession();
  const roles = session?.user.role?.split(',') ?? [];
  return { isAdmin: roles.includes('admin'), isPending };
}
