import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/admin/jobs/$jobId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { jobId } = Route.useParams(); 
  
  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mb-4 mt-2 flex shrink-0 justify-between items-center">
        <h1 className="font-bold text-xl">{jobId}</h1>
      </div>
    </div>
  );
}
