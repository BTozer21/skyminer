import { createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '../auth';
import { Layout } from '@/ops/Layout';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: '/login' });
    }
    return { user: data.user };
  },
  component: Layout,
})
