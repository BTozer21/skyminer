import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/calendar')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="px-5">
      Calendar
    </div>
  )
}
