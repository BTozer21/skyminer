import { useMemo, useState } from 'react'
import {
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWeekend,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Monday-start week, matching the admin schedule.
const weekOpts = { weekStartsOn: 1 } as const

// The API hands back date-only strings ("2026-03-05"). `new Date(str)` would
// read those as UTC midnight, which lands on the previous day anywhere west of
// Greenwich, so build the local date explicitly.
export function parseDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export interface CalendarEvent {
  id: string
  title: string
  // Second line inside the bar — the customer for a job, the status for leave.
  subtitle?: string
  // Inclusive on both ends: everything here is an all-day span, never a time.
  start: Date
  end: Date
  className: string
  onClick?: () => void
}

// One bar as it appears in a single week row: an event clipped to that week,
// placed in a column range and a stacking lane.
interface Segment {
  event: CalendarEvent
  colStart: number
  span: number
  lane: number
  // Whether the event itself begins/ends here, or is continuing across the
  // week boundary — drives which corners get rounded.
  opensLeft: boolean
  opensRight: boolean
}

// Greedy lane packing: an event takes the first lane whose last bar has
// already ended. Events are sorted longest-first so the big spans sit at the
// top of the cell and the one-day jobs fill in underneath.
function layoutWeek(weekStart: Date, weekEnd: Date, events: Array<CalendarEvent>): Array<Segment> {
  const overlapping = events
    .filter((event) => event.start <= weekEnd && event.end >= weekStart)
    .sort((a, b) => {
      const byStart = a.start.getTime() - b.start.getTime()
      if (byStart !== 0) return byStart
      return b.end.getTime() - a.end.getTime()
    })

  const laneEnds: Array<number> = []

  return overlapping.map((event) => {
    const from = event.start > weekStart ? event.start : weekStart
    const to = event.end < weekEnd ? event.end : weekEnd
    const colStart = differenceInCalendarDays(from, weekStart) + 1
    const span = differenceInCalendarDays(to, from) + 1

    let lane = laneEnds.findIndex((end) => end < colStart)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = colStart + span - 1

    return {
      event,
      colStart,
      span,
      lane,
      opensLeft: event.start >= weekStart,
      opensRight: event.end <= weekEnd,
    }
  })
}

interface MemberCalendarProps {
  events: Array<CalendarEvent>
  // Rendered under the grid — a key for what the colours mean.
  legend?: React.ReactNode
}

export function MemberCalendar({ events, legend }: MemberCalendarProps) {
  const [today] = useState(() => new Date())
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  // One page is exactly one month: the grid runs from the Monday on or before
  // the 1st to the Sunday on or after the last day, so it is 5 or 6 whole
  // week rows and never bleeds into the month after next.
  const weeks = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), weekOpts)
    const gridEnd = endOfWeek(endOfMonth(month), weekOpts)
    // eachDayOfInterval has no step option in date-fns 4, so step the weeks
    // directly rather than taking every 7th day of the interval.
    const weekCount = (differenceInCalendarDays(gridEnd, gridStart) + 1) / 7

    return Array.from({ length: weekCount }, (_, i) => {
      const weekStart = addWeeks(gridStart, i)
      const weekEnd = endOfWeek(weekStart, weekOpts)
      return {
        weekStart,
        days: eachDayOfInterval({ start: weekStart, end: weekEnd }),
        segments: layoutWeek(weekStart, weekEnd, events),
      }
    })
  }, [month, events])

  // The phone layout is a list, not a grid: every event that touches this
  // month, listed once under the day it starts (or under the 1st if it began
  // in the previous month), rather than repeated on each day it spans.
  const agenda = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)

    const inMonth = events
      .filter((event) => event.start <= monthEnd && event.end >= monthStart)
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    const byDay = new Map<string, { day: Date; events: Array<CalendarEvent> }>()
    for (const event of inMonth) {
      const day = event.start > monthStart ? event.start : monthStart
      const key = format(day, 'yyyy-MM-dd')
      const group = byDay.get(key) ?? { day, events: [] }
      group.events.push(event)
      byDay.set(key, group)
    }

    return [...byDay.values()]
  }, [month, events])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h2 className="font-semibold text-xl">{format(month, 'MMMM yy')}</h2>
        <div className="flex items-center gap-1">
          <Button
            title="Previous month"
            variant="outline"
            size="icon"
            className="size-11 md:size-9"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            title="Return to today"
            variant="ghost"
            className="h-11 md:h-9"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            title="Next month"
            variant="outline"
            size="icon"
            className="size-11 md:size-9"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {/* Month grid: tablet and desktop only. Below md the seven columns
          are too narrow to read, so the agenda below takes over. */}
      <div className="mt-3 hidden min-h-0 flex-1 flex-col overflow-x-auto md:flex">
        <div className="flex min-h-0 min-w-lg flex-1 flex-col">
          <div className="bg-muted grid shrink-0 grid-cols-7">
            {weeks[0]?.days.map((day) => (
              <div
                key={day.toISOString()}
                className="border p-2 text-center text-xs font-medium uppercase"
              >
                {format(day, 'EEE')}
              </div>
            ))}
          </div>

          {weeks.map(({ weekStart, days, segments }) => {
            // Every lane in this week gets a row of height, so a busy week
            // grows and a quiet one stays compact.
            const lanes = segments.reduce((max, s) => Math.max(max, s.lane + 1), 0)

            return (
              <div
                key={weekStart.toISOString()}
                className="relative flex-1"
                // Date number + one row per lane + the gaps between.
                style={{ minHeight: `${2.25 + lanes * 1.5}rem` }}
              >
                <div className="grid h-full grid-cols-7">
                  {days.map((day) => {
                    const isToday = isSameDay(day, today)
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          'border p-1',
                          isToday
                            ? 'bg-blue-500/20 dark:bg-blue-500/10'
                            : isWeekend(day)
                              ? 'bg-muted/80'
                              : '',
                          // Days spilling in from the neighbouring month stay
                          // visible but recede.
                          !isSameMonth(day, month) && 'text-muted-foreground/50',
                        )}
                      >
                        <span
                          className={cn(
                            'px-1 text-sm',
                            isToday &&
                              'font-semibold text-blue-600 dark:text-blue-400',
                          )}
                        >
                          {isToday && 'Today, '}{format(day, 'd')}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Bars sit over the day cells so a multi-day event is one
                    continuous band rather than a chip repeated per day. */}
                <div className="pointer-events-none absolute inset-x-0 top-7 grid grid-cols-7 gap-y-1">
                  {segments.map(({ event, colStart, span, lane, opensLeft, opensRight }) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={event.onClick}
                      disabled={!event.onClick}
                      title={[event.title, event.subtitle].filter(Boolean).join(' — ')}
                      className={cn(
                        'pointer-events-auto truncate px-2 py-0.5 text-left text-xs leading-4 transition-opacity',
                        event.onClick && 'cursor-pointer hover:opacity-80',
                        event.className,
                        // A band that runs off the end of the week is left
                        // square there, so it reads as continuing.
                        opensLeft ? 'ml-0.5 rounded-l-sm' : '',
                        opensRight ? 'mr-0.5 rounded-r-sm' : '',
                      )}
                      style={{
                        gridColumn: `${colStart} / span ${span}`,
                        gridRow: lane + 1,
                      }}
                    >
                      <span className="font-medium">{event.title}</span>
                      {event.subtitle ? (
                        <span className="opacity-75"> · {event.subtitle}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Agenda: phones only. Scrolls on its own so the month controls stay
          put, and rows are sized for a thumb rather than a cursor. */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto md:hidden">
        {agenda.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nothing scheduled in {format(month, 'MMMM')}.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {agenda.map(({ day, events: dayEvents }) => (
              <li key={day.toISOString()}>
                <p
                  className={cn(
                    'text-muted-foreground mb-1 text-xs font-medium uppercase',
                    isSameDay(day, today) && 'text-blue-600 dark:text-blue-400',
                  )}
                >
                  {format(day, 'EEE d MMM')}
                  {isSameDay(day, today) ? ' · Today' : ''}
                </p>
                <ul className="flex flex-col gap-1">
                  {dayEvents.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={event.onClick}
                        disabled={!event.onClick}
                        className={cn(
                          // min-h-11 keeps every row at a 44px touch target.
                          'flex min-h-11 w-full flex-col justify-center rounded-sm px-3 py-2 text-left',
                          event.onClick && 'cursor-pointer active:opacity-80',
                          event.className,
                        )}
                      >
                        <span className="text-sm font-medium">{event.title}</span>
                        <span className="text-xs opacity-75">
                          {/* A single-day event reads as one date, not a range. */}
                          {isSameDay(event.start, event.end)
                            ? format(event.start, 'd MMM')
                            : `${format(event.start, 'd MMM')} – ${format(event.end, 'd MMM')}`}
                          {event.subtitle ? ` · ${event.subtitle}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      {legend ? <div className="mt-3 hidden shrink-0 md:block">{legend}</div> : null}
    </div>
  )
}
