import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_ops')({
  beforeLoad: ({ context }) => {
    if (!context.user.role?.split(',').includes('admin')) {
      throw redirect({ to: '/' })
    }
  },
})
