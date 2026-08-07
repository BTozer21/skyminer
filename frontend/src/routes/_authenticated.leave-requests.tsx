import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/_authenticated/leave-requests')({
  component: RouteComponent,
})

function RouteComponent() {

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mb-4 mt-2 flex shrink-0 justify-between items-center">
        <h1 className="font-bold text-xl">Leave Requests</h1>
        <p>Users will submit leave requests here.</p>
      </div>
    </div>
  )
}
