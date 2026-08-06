import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getISOWeek,
  isSameDay,
  startOfWeek,
  isWeekend,
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authClient } from '../auth';
import { getJobAssignments } from '@/lib/api.ts';

export const Route = createFileRoute('/_authenticated/admin/')({
  component: RouteComponent2,
})

// Monday-start week. weekStartsOn: 1 => Monday (0=Sun … 6=Sat)
const weekOpts = { weekStartsOn: 1 } as const;

// One fetch covers this many weeks; one virtual item is one week.
const WEEKS_PER_PAGE = 4;
// Start loading the next page while this many weeks are still below you, so
// the request lands before you scroll onto empty rows.
const PREFETCH_WEEKS = 2;

// Page N = the WEEKS_PER_PAGE weeks starting N pages after the anchor week.
// Each page fetches its own date range, so pages are appended and never
// refetched as you scroll.
async function fetchWeekPage(anchor: Date, page: number) {
  const firstWeekStart = startOfWeek(
    addWeeks(anchor, page * WEEKS_PER_PAGE),
    weekOpts,
  );
  const lastWeekEnd = endOfWeek(
    addWeeks(firstWeekStart, WEEKS_PER_PAGE - 1),
    weekOpts,
  );

  const jobs = await getJobAssignments(
    format(firstWeekStart, 'yyyy-MM-dd'),
    format(lastWeekEnd, 'yyyy-MM-dd'),
  );

  const weeks = Array.from({ length: WEEKS_PER_PAGE }, (_, i) =>
    addWeeks(firstWeekStart, i),
  );

  return { weeks, jobs, nextPage: page + 1 };
}

function RouteComponent2() {
  const [today] = useState(() => new Date());
  // Anchor once, so the page/date arithmetic can't drift between renders.
  const [anchor] = useState(() => startOfWeek(new Date(), weekOpts));
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

  const {
    status,
    data,
    error,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['schedule', format(anchor, 'yyyy-MM-dd')],
    queryFn: ({ pageParam }) => fetchWeekPage(anchor, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: Infinity,
  });

  const allWeeks = useMemo(
    () => data?.pages.flatMap((p) => p.weeks) ?? [],
    [data],
  );

  // The endpoint returns jobs-with-users-nested (clean date filter on the top
  // level); the grid renders by user, so invert every loaded page into
  // userId -> their jobs.
  const jobsByUser = useMemo(() => {
    const map = new Map<string, { name: string; startDate: string; endDate: string }[]>();
    for (const page of data?.pages ?? []) {
      for (const job of page.jobs) {
        for (const assignment of job.jobAssignments) {
          const user = assignment.userInNeonAuth;
          if (!user) continue;
          const list = map.get(user.id) ?? [];
          list.push({ name: job.name, startDate: job.startDate, endDate: job.endDate });
          map.set(user.id, list);
        }
      }
    }
    return map;
  }, [data]);

  // A cell is the job (if any) covering this user on this day.
  const getCell = (date: Date, userId: string) => {
    const day = format(date, 'yyyy-MM-dd');
    const job = jobsByUser
      .get(userId)
      ?.find((j) => j.startDate <= day && day <= j.endDate);
    return (job?.name ? (<span className="text-muted-foreground p-2 bg-muted/30 rounded-sm">{job.name}</span>) : '—');
  };

  // Virtualize whole week blocks so only on-screen weeks are in the DOM.
  // A week is one item, which keeps the merged WK cell inside a single node.
  // The +1 is the loader row at the bottom.
  const virtualizer = useVirtualizer({
    count: hasNextPage ? allWeeks.length + 1 : allWeeks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300,
    // Low: an item is ~a viewport tall, so a large overscan would prefetch
    // pages you haven't come close to yet. PREFETCH_WEEKS is the real knob.
    overscan: 1,
  });

  const items = virtualizer.getVirtualItems();

  useEffect(() => {
    const [lastItem] = [...items].reverse();
    if (!lastItem) return;

    if (
      lastItem.index >= allWeeks.length - PREFETCH_WEEKS &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage, allWeeks.length, isFetchingNextPage, items]);

  // getVirtualItems() includes the overscan buffer above the viewport, so
  // items[0] is a week or so too high. Pick the first item actually in view:
  // the first whose bottom edge has scrolled past the top of the viewport.
  const scrollOffset = virtualizer.scrollOffset ?? 0;
  const topItem = items.find((item) => item.end > scrollOffset) ?? items[0];
  const topIndex = topItem?.index ?? 0;
  const topWeekStart = allWeeks[topIndex] ?? anchor;

  if (status === 'pending') return <p className="p-5">Loading…</p>;
  if (status === 'error') return <span className="p-5">Error: {error.message}</span>;

  return (
    <div className="flex flex-col px-5">
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          Week of {format(topWeekStart, 'MMM d, yyyy')}
        </h1>
        <div className="flex items-center gap-1">
          <Button
            title="Previous Week"
            variant="outline"
            size="icon"
            onClick={() =>
              virtualizer.scrollToIndex(Math.max(0, topIndex - 1), { align: 'start' })
            }
            // Index 0 is the anchor week; there is nothing loaded before it.
            disabled={topIndex === 0}
            aria-label="Previous week"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            title="Return to Today"
            variant="ghost"
            onClick={() => virtualizer.scrollToIndex(0, { align: 'start' })}
          >
            Today
          </Button>
          <Button
            title="Next Week"
            variant="outline"
            size="icon"
            onClick={() => virtualizer.scrollToIndex(topIndex + 1, { align: 'start' })}
            aria-label="Next week"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {/* Outer: horizontal scroll for many users. */}
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-max">
          {/* Inner: vertical scroll region = the virtualizer viewport. */}
          <div ref={parentRef} className="border h-[85dvh] overflow-x-hidden overflow-y-auto">
            {/* The header lives inside the scroll region so it loses the same
                width to the scrollbar as the rows do. Platforms with classic
                (non-overlay) scrollbars — most Linux setups — misalign it by
                the scrollbar width if it sits outside. */}
            <div className="bg-muted sticky top-0 z-10 flex">
              <div className="w-12 shrink-0 border p-2 text-md font-medium">WK</div>
              <div
                className="grid flex-1"
                style={{
                  gridTemplateColumns: `7rem repeat(${users.length}, minmax(140px, 1fr))`,
                }}
              >
                <div className="border p-2 font-medium">
                  {format(topWeekStart, 'MMM yyyy')}
                </div>
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="content-center border p-2 text-center text-xs font-medium uppercase"
                  >
                    {user.name}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
            >
              {items.map((vi) => {
                const isLoaderRow = vi.index > allWeeks.length - 1;
                const weekStart = allWeeks[vi.index];

                return (
                  <div
                    key={vi.key}
                    data-index={vi.index}
                    ref={virtualizer.measureElement}
                    className="absolute top-0 left-0 flex w-full"
                    style={{ transform: `translateY(${vi.start}px)` }}
                  >
                    {isLoaderRow ? (
                      <div className="text-muted-foreground p-4 text-sm">
                        Loading more weeks…
                      </div>
                    ) : (
                      <>
                        <div className="bg-muted flex w-12 shrink-0 justify-center border p-2 font-medium">
                          {getISOWeek(weekStart)}
                        </div>
                        <div
                          className="grid flex-1"
                          style={{
                            gridTemplateColumns: `7rem repeat(${users.length}, minmax(140px, 1fr))`,
                          }}
                        >
                          {eachDayOfInterval({
                            start: weekStart,
                            end: endOfWeek(weekStart, weekOpts),
                          }).map((day) => {
                            const isToday = isSameDay(day, today);
                            const weekend = isWeekend(day)
                            // Faint blue on every cell => whole-row highlight.
                            const rowBg = isToday ? 'bg-blue-500/20 dark:bg-blue-500/10' : weekend ? 'bg-muted/80' : '';
                            return (
                              <Fragment key={day.toISOString()}>
                                <div
                                  className={`border p-2 ${rowBg} ${isToday ? 'font-semibold' : ''}`}
                                >
                                  <span className="text-muted-foreground text-xs uppercase">
                                    {format(day, 'EEE')}
                                  </span>{' '}
                                  <span className={`${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>{format(day, 'd')}</span>
                                </div>
                                {users.map((user) => (
                                  <div
                                    key={user.id}
                                    className={`content-center text-center w-full border p-2 text-sm ${rowBg}`}
                                  >
                                    {getCell(day, user.id)}
                                  </div>
                                ))}
                              </Fragment>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="text-muted-foreground mt-2 text-xs">
        {isFetching && !isFetchingNextPage ? 'Background updating…' : null}
      </div>
    </div>
  );
}
