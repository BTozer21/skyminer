import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getJobs } from '@/lib/api';

import { CreateJobForm } from '@/components/forms/v1/create-job-form';
import { columns } from '@/components/tables/v1/jobs/columns';
import { DataTable } from '@/components/tables/v1/data-table';

export const Route = createFileRoute('/_authenticated/admin/jobs')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: jobs, isPending } = useQuery({ queryKey: ['jobs'], queryFn: getJobs, staleTime: Infinity });

  return (
    <div className="flex flex-col px-5">
      <div className="mb-4 mt-2 flex justify-between items-center">
        <h1 className="font-bold text-xl">Jobs</h1>
        <CreateJobForm />
      </div>
      <div>
        {isPending && <p>Waiting for Jobs</p>}
        {jobs && <DataTable columns={columns} data={jobs} />}
      </div>
    </div>
  )
}
