import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getISOWeek,
  isSameDay,
  startOfWeek,
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authClient } from '../auth';
import { getJobAssignments } from '@/lib/api.ts';

export const Route = createFileRoute('/_authenticated/admin/')({
  component: RouteComponent,
})

// Monday-start week. weekStartsOn: 1 => Monday (0=Sun … 6=Sat)
const weekOpts = { weekStartsOn: 1 } as const;

// A large fixed virtual list so weeks feel infinite in both directions.
// Index CURRENT_INDEX == the current week; lower indexes are past weeks.
const TOTAL_WEEKS = 240; // ~10 years each way
const CURRENT_INDEX = TOTAL_WEEKS / 2;

// Job-assignment fetch window, in weeks. The window snaps to FETCH_BLOCK steps
// (so scrolling within a block doesn't refetch) and is padded FETCH_PAD weeks
// each side (so the data is already there when you cross into the next block).
const FETCH_BLOCK = 12;
const FETCH_PAD = 12;

function RouteComponent() {
  const [today] = useState(() => new Date());
  const parentRef = useRef<HTMLDivElement>(null);

  // Same source as the admin/team page.
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await authClient.admin.listUsers({
        query: { limit: 100 },
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const users = usersQuery.data?.users ?? [];

  // Virtualize whole week blocks so only on-screen weeks are in the DOM.
  // A week is one item, which keeps the merged WK cell inside a single node.
  const virtualizer = useVirtualizer({
    count: TOTAL_WEEKS,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300,
    overscan: 3,
  });

  // Start centred on the current week (list otherwise opens ~10 years ago).
  useEffect(() => {
    virtualizer.scrollToIndex(CURRENT_INDEX, { align: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Index -> that week's Monday. Index CURRENT_INDEX is this week.
  const weekStartForIndex = (index: number) =>
    startOfWeek(addWeeks(today, index - CURRENT_INDEX), weekOpts);

  const items = virtualizer.getVirtualItems();
  // getVirtualItems() includes the overscan buffer above the viewport, so
  // items[0] is a few weeks too high. Pick the first item actually in view:
  // the first whose bottom edge has scrolled past the top of the viewport.
  const scrollOffset = virtualizer.scrollOffset ?? 0;
  const topItem = items.find((item) => item.end > scrollOffset) ?? items[0];
  const topIndex = topItem?.index ?? CURRENT_INDEX;
  const topWeekStart = weekStartForIndex(topIndex);

  // Fetch only the weeks around the viewport, padded so scrolling stays ahead
  // of the data. Quantize the anchor to FETCH_BLOCK-week steps so the query key
  // (and thus refetches) changes only when you scroll a whole block, not on
  // every scroll frame. PAD >= BLOCK means the next block's data was already in
  // the previous fetch, so cells don't blank out as you cross a boundary.
  const anchorIndex = Math.floor(topIndex / FETCH_BLOCK) * FETCH_BLOCK;
  const windowFrom = format(weekStartForIndex(anchorIndex - FETCH_PAD), 'yyyy-MM-dd');
  const windowTo = format(
    endOfWeek(weekStartForIndex(anchorIndex + FETCH_BLOCK + FETCH_PAD), weekOpts),
    'yyyy-MM-dd',
  );

  const assignmentsQuery = useQuery({
    queryKey: ['job-assignments', windowFrom, windowTo],
    queryFn: () => getJobAssignments(windowFrom, windowTo),
    staleTime: Infinity,
    // Keep the current grid visible while the next block loads instead of
    // flashing empty on every boundary crossing.
    placeholderData: (prev) => prev,
  });

  // The endpoint returns jobs-with-users-nested (clean date filter on the top
  // level); the grid renders by user, so invert once into userId -> their jobs.
  const jobsByUser = useMemo(() => {
    const map = new Map<string, { name: string; startDate: string; endDate: string }[]>();
    for (const job of assignmentsQuery.data ?? []) {
      for (const assignment of job.jobAssignments) {
        const user = assignment.userInNeonAuth;
        if (!user) continue;
        const list = map.get(user.id) ?? [];
        list.push({ name: job.name, startDate: job.startDate, endDate: job.endDate });
        map.set(user.id, list);
      }
    }
    return map;
  }, [assignmentsQuery.data]);

  // A cell is the job (if any) covering this user on this day.
  const getCell = (date: Date, userId: string) => {
    const day = format(date, 'yyyy-MM-dd');
    const job = jobsByUser
      .get(userId)
      ?.find((j) => j.startDate <= day && day <= j.endDate);
    return job?.name ?? '—';
  };

  // Day column + one column per user. Inline because the user count is dynamic.
  const columnStyle = {
    gridTemplateColumns: `7rem repeat(${users.length}, minmax(140px, 1fr))`,
  };

  return (
    <div className="flex flex-col px-5">
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          Week of {format(topWeekStart, 'MMM d, yyyy')}
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              virtualizer.scrollToIndex(topIndex - 1, { align: 'start' })
            }
            aria-label="Previous week"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              virtualizer.scrollToIndex(CURRENT_INDEX, { align: 'start' })
            }
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              virtualizer.scrollToIndex(topIndex + 1, { align: 'start' })
            }
            aria-label="Next week"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {/* Outer: horizontal scroll for many users. */}
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-max">
          {/* Header sits above the vertical scroll region and shares its columns. */}
          <div className="flex">
            <div className="w-12 shrink-0 border p-2 text-xs font-medium">
              WK
            </div>
            <div className="grid flex-1" style={columnStyle}>
              <div className="border p-2 font-medium">
                {format(topWeekStart, 'MMM yyyy')}
              </div>
              {users.map((user) => (
                <div
                  key={user.id}
                  className="border p-2 text-center text-xs font-medium uppercase"
                >
                  {user.name}
                </div>
              ))}
            </div>
          </div>

          {/* Inner: vertical scroll region = the virtualizer viewport. */}
          <div ref={parentRef} className="h-[70vh] overflow-x-hidden overflow-y-auto">
            <div
              style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
            >
              {items.map((vi) => {
                const weekStart = weekStartForIndex(vi.index);
                const days = eachDayOfInterval({
                  start: weekStart,
                  end: endOfWeek(weekStart, weekOpts),
                });
                return (
                  <div
                    key={vi.key}
                    data-index={vi.index}
                    ref={virtualizer.measureElement}
                    className="absolute top-0 left-0 flex w-full"
                    style={{ transform: `translateY(${vi.start}px)` }}
                  >
                    <div className="bg-muted flex w-12 shrink-0 justify-center border p-2 font-medium">
                      {getISOWeek(weekStart)}
                    </div>
                    <div className="grid flex-1" style={columnStyle}>
                      {days.map((day) => {
                        const isToday = isSameDay(day, today);
                        // Faint blue on every cell => whole-row highlight.
                        const rowBg = isToday ? 'bg-blue-500/10' : '';
                        return (
                          <Fragment key={day.toISOString()}>
                            <div
                              className={`border p-2 ${rowBg} ${isToday ? 'font-semibold' : ''}`}
                            >
                              <span className="text-muted-foreground text-xs uppercase">
                                {format(day, 'EEE')}
                              </span>{' '}
                              {format(day, 'd')}
                            </div>
                            {users.map((user) => (
                              <div
                                key={user.id}
                                className={`border p-2 text-sm ${rowBg}`}
                              >
                                {getCell(day, user.id)}
                              </div>
                            ))}
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
