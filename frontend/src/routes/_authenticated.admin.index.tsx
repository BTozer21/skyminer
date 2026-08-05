import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query';
import { CreateJobForm } from '@/components/forms/v1/create-job-form';

export const Route = createFileRoute('/_authenticated/admin/')({
  component: RouteComponent,
})

function RouteComponent() {

  return (
    <div className="flex flex-col px-5">
      <h1 className="font-bold text-xl">This is where the calender goes</h1>
    </div>
  )
}
