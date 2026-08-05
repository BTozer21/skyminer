import { Fragment, useEffect, useRef, useState } from 'react'
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

export const Route = createFileRoute('/_authenticated/admin/')({
  component: RouteComponent,
})

// Monday-start week. weekStartsOn: 1 => Monday (0=Sun … 6=Sat)
const weekOpts = { weekStartsOn: 1 } as const;

// A large fixed virtual list so weeks feel infinite in both directions.
// Index CURRENT_INDEX == the current week; lower indexes are past weeks.
const TOTAL_WEEKS = 240; // ~10 years each way
const CURRENT_INDEX = TOTAL_WEEKS / 2;

// TODO: replace with a real per-(day, user) data lookup.
function getCell(_date: Date, _userId: string) {
  return '—';
}

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
