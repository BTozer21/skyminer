import { createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '../auth';

// Layout route: every route file named _authenticated.admin.*.tsx nests under
// this and inherits the beforeLoad guard. beforeLoad runs outside React, so we
// read the session directly instead of using the useIsAdmin hook.
export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user.role?.split(',').includes('admin')) {
      throw redirect({ to: '/' });
    }
  },
});
