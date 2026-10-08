import { Fragment, useEffect, useRef, useState } from 'react'

import { COLOUR_HUES, STATUS_CLASS, jobTitle, useBoard } from '../board'
import type { Board, Job, TeamMember } from '../board'
import {
  addDays,
  addMonths,
  daysBetween,
  isoWeek,
  longDate,
  mondayOf,
  monthYear,
  overlaps,
  parseIsoDate,
  quarterStart,
  shortDate,
  weekday,
} from '../dates'
import { useDrawers } from '../drawers'
import { Icon } from '../icons'
import { Avatar } from '../ui'
import { PlannerHead } from './PlannerHead'

export const ZOOM_STEPS = [50, 75, 90, 100, 110, 125, 150, 200] as const

export function TeamGrid() {
  const board = useBoard()
  const drawers = useDrawers()
  const [start, setStart] = useState(() => quarterStart(board.today))
  const [jump, setJump] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<number | null>(null)
  const shownZoom = zoom ?? board.preview.plannerZoom

  const end = addDays(addMonths(start, 3), -1)
  const days = Array.from({ length: daysBetween(start, end) + 1 }, (_, i) => addDays(start, i))
  const inRange = board.jobs.filter((j) => overlaps(j.startDate, j.endDate, start, end))
  const onJobs = new Set(inRange.flatMap((j) => j.crewIds))
  const columns = board.team.filter((m) => m.active || onJobs.has(m.id))
  const showUncrewed = inRange.some((j) => j.crewIds.length === 0)
  const labels = columnLabels(columns)

  const title =
    start.slice(0, 7) === end.slice(0, 7)
      ? monthYear(start)
      : `${parseIsoDate(start).toLocaleDateString('en-GB', { month: 'short' })} – ${parseIsoDate(end).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const lastMonday = addDays(mondayOf(board.today), -7)
    const row = wrap.querySelector(`tr[data-date="${lastMonday}"]`)
    const head = wrap.querySelector('thead')?.getBoundingClientRect().height ?? 0
    wrap.scrollTop = row
      ? wrap.scrollTop + row.getBoundingClientRect().top - wrap.getBoundingClientRect().top - head
      : 0
  }, [start, jump, board.today])

  const bookCell = (date: string, crewId?: string) => () => drawers.newJob({ date, crewId })

  return (
    <>
      <PlannerHead
        mode="grid"
        title={title}
        eyebrow={`Q${Math.floor(parseIsoDate(start).getMonth() / 3) + 1} · ${shortDate(start)} – ${longDate(end)} · ${inRange.length} jobs`}
        actions={
          <>
            <ZoomControl value={shownZoom} onChange={setZoom} />
            <button
              type="button"
              className="btn icon"
              aria-label="Previous quarter"
              onClick={() => setStart(addMonths(start, -3))}
            >
              {Icon.left}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setStart(quarterStart(board.today))
                setJump((n) => n + 1)
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="btn icon"
              aria-label="Next quarter"
              onClick={() => setStart(addMonths(start, 3))}
            >
              {Icon.right}
            </button>
            <button type="button" className="btn primary" onClick={() => drawers.newJob()}>
              {Icon.plus}New job
            </button>
          </>
        }
      />

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="pg-wrap" ref={wrapRef}>
          <table className="pg" style={{ zoom: shownZoom / 100 }}>
            <thead>
              <tr>
                <th className="wkc">Wk</th>
                <th className="dc">Date</th>
                {columns.map((m) => (
                  <th key={m.id} className={m.active ? '' : 'inactive'} title={m.name}>
                    <Avatar name={m.name} />
                    {labels.get(m.id)}
                  </th>
                ))}
                {showUncrewed && <th className="unc">Not crewed</th>}
              </tr>
            </thead>
            <tbody>
              {days.map((date, i) => {
                const d = parseIsoDate(date)
                const dayJobs = inRange.filter((j) => overlaps(j.startDate, j.endDate, date, date))
                const cell = (job: Job, crewId?: string) => (
                  <JobCell
                    key={job.id}
                    job={job}
                    date={date}
                    rangeStart={start}
                    isLead={!!crewId && job.leadId === crewId}
                    board={board}
                  />
                )
                const rowClass = [
                  d.getDay() === 0 || d.getDay() === 6 ? 'we' : '',
                  date === board.today ? 'today' : '',
                  date < board.today ? 'done' : '',
                  d.getDay() === 1 && i > 0 ? 'wkstart' : '',
                ].join(' ')
                return (
                  <Fragment key={date}>
                    {i > 0 && d.getDate() === 1 && (
                      <tr className="mrow">
                        <td colSpan={columns.length + 2 + (showUncrewed ? 1 : 0)}>{monthYear(date)}</td>
                      </tr>
                    )}
                    <tr className={rowClass} data-date={date}>
                      <td className="wkc">{d.getDay() === 1 || i === 0 ? isoWeek(date) : ''}</td>
                      <td className="dc">
                        <span>{weekday(date).toUpperCase()}</span>
                        <b>{d.getDate()}</b>
                      </td>
                      {columns.map((m) => (
                        <td key={m.id} className="c" onClick={bookCell(date, m.id)}>
                          {dayJobs.filter((j) => j.crewIds.includes(m.id)).map((j) => cell(j, m.id))}
                        </td>
                      ))}
                      {showUncrewed && (
                        <td className="c" onClick={bookCell(date)}>
                          {dayJobs.filter((j) => j.crewIds.length === 0).map((j) => cell(j))}
                        </td>
                      )}
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="legend">
        <span>
          <i className="legend-done" /> Done, up to today
        </span>
        <span>Each job keeps its colour across everyone on it</span>
        <span>{Icon.crown} Lead</span>
        <span>
          <i className="legend-dot" /> Needs attention
        </span>
        <span>Click an empty cell to book that person</span>
      </div>
    </>
  )
}

function JobCell({
  job,
  date,
  rangeStart,
  isLead,
  board,
}: {
  job: Job
  date: string
  rangeStart: string
  isLead: boolean
  board: Board
}) {
  const drawers = useDrawers()
  const customer = board.customerName(job.customerId)
  const first = date === job.startDate || date === rangeStart
  return (
    <button
      type="button"
      className={`pc ${STATUS_CLASS[job.status]}`}
      style={{ ['--h' as string]: COLOUR_HUES[job.colour] }}
      title={`${customer} · ${jobTitle(job)}`}
      onClick={(e) => {
        e.stopPropagation()
        drawers.openJob(job.id)
      }}
    >
      {first && board.issues(job).length > 0 && <i className="w" />}
      {isLead && Icon.crown}
      {customer}
      {first && <small>{jobTitle(job)}</small>}
    </button>
  )
}

function columnLabels(people: TeamMember[]): Map<string, string> {
  const first = (m: TeamMember) => m.name.split(' ')[0].toUpperCase()
  return new Map(
    people.map((m) => {
      const clash = people.some((o) => o.id !== m.id && first(o) === first(m))
      const initial = m.name.split(' ')[1]?.[0]
      return [m.id, clash && initial ? `${first(m)} ${initial.toUpperCase()}` : first(m)]
    }),
  )
}

function ZoomControl({ value, onChange }: { value: number; onChange: (zoom: number) => void }) {
  const smaller = [...ZOOM_STEPS].reverse().find((z) => z < value)
  const bigger = ZOOM_STEPS.find((z) => z > value)
  return (
    <div className="zoom" role="group" aria-label="Zoom">
      <button
        type="button"
        className="btn icon"
        aria-label="Zoom out"
        disabled={!smaller}
        onClick={() => smaller && onChange(smaller)}
      >
        −
      </button>
      <select
        className="select"
        aria-label="Zoom level"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {ZOOM_STEPS.map((z) => (
          <option key={z} value={z}>
            {z}%
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn icon"
        aria-label="Zoom in"
        disabled={!bigger}
        onClick={() => bigger && onChange(bigger)}
      >
        +
      </button>
    </div>
  )
}
