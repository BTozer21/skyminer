import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth/v1/login-form'

export const Route = createFileRoute('/_auth/login')({
  component: RouteComponent,
})

function RouteComponent() {
  return <LoginForm />
}
