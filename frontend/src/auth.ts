import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
  plugins: [adminClient()],
  fetchOptions: { credentials: 'include' },
});

// role is a comma-separated list, e.g. "user" or "user,admin"
export function useIsAdmin() {
  const { data: session, isPending } = authClient.useSession();
  const roles = session?.user.role?.split(',') ?? [];
  return { isAdmin: roles.includes('admin'), isPending };
}
