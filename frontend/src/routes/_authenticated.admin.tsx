import { createFileRoute, redirect } from '@tanstack/react-router';

// Layout route: every route file named _authenticated.admin.*.tsx nests under
// this and inherits the beforeLoad guard. beforeLoad runs outside React, so we
// read the user from the _authenticated context instead of using useIsAdmin.
export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: ({ context }) => {
    if (!context.user.role?.split(',').includes('admin')) {
      throw redirect({ to: '/' });
    }
  },
});
