import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/admin/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-col px-5">
      <h1 className="font-bold text-xl">This is an admin route</h1>
    </div>
  )
}
