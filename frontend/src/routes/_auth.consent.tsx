import { createFileRoute } from '@tanstack/react-router'
import { ConsentForm } from '@/components/auth/v1/consent-form'

export const Route = createFileRoute('/_auth/consent')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ConsentForm />
}
