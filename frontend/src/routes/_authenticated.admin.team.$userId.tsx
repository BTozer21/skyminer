import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';

import { getTeamMember } from '@/lib/api';
import { LEAVE_STATUS_CONFIG } from '@/lib/v1/leave';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/_authenticated/admin/team/$userId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = Route.useParams();

  const { data: member, isPending, error } = useQuery({
    queryKey: ['admin-users', userId],
    queryFn: () => getTeamMember(userId),
    staleTime: Infinity,
  });

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mt-2 mb-4 flex shrink-0 items-center gap-2">
        {isPending ? (
          <Skeleton className="h-7 w-40" />
        ) : (
          <span className="flex flex-col items-baseline gap-1">
            <h1 className="text-xl font-bold">{member?.name}</h1>
            <span className="text-muted-foreground text-sm">{member?.email}</span>
          </span>
        )}
      </div>

      <h3 className="mb-2 shrink-0">Leave Requests</h3>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <Skeleton className="h-14 w-full max-w-md" />
        ) : error ? (
          <p className="text-muted-foreground text-sm">{error.message}</p>
        ) : member?.leaveRequests.length ? (
          <ul className="flex max-w-md flex-col gap-2">
            {member.leaveRequests.map((request) => {
              const status = LEAVE_STATUS_CONFIG[request.status];
              const StatusIcon = status.icon;

              return (
                <li
                  key={request.id}
                  className="bg-muted/40 flex items-start justify-between gap-3 rounded-sm px-3 py-2"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">
                      {/* A single day reads as one date, not "5 Mar – 5 Mar". */}
                      {request.startDate === request.endDate
                        ? format(new Date(request.startDate), 'dd/MM/yyyy')
                        : `${format(new Date(request.startDate), 'dd/MM/yyyy')} – ${format(new Date(request.endDate), 'dd/MM/yyyy')}`}
                    </span>
                    {request.comment ? (
                      <span className="text-muted-foreground text-xs">{request.comment}</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{status.label}</span>
                    <StatusIcon className={`size-4 shrink-0 ${status.className}`} />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            {member?.name} has no leave requests.
          </p>
        )}
      </div>
    </div>
  );
}
