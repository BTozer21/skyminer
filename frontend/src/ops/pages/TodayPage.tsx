import type { ReactElement } from 'react'
import { Link } from '@tanstack/react-router'

import { PAPERWORK, PAPERWORK_LABELS, STATUS_CLASS, jobService, jobTitle, useBoard } from '../board'
import type { Board, Job } from '../board'
import { addDays, dateRange, daysBetween, mondayOf, overlaps, shortDate, weekday } from '../dates'
import { useDrawers } from '../drawers'
import { Icon } from '../icons'
import { CrewAvatars, PageHead } from '../ui'

export function TodayPage() {
  const board = useBoard()
  const drawers = useDrawers()
  const { today, jobs } = board

  const weekStart = mondayOf(today)
  const weekEnd = addDays(weekStart, 6)
  const thisWeek = jobs.filter((j) => overlaps(j.startDate, j.endDate, weekStart, weekEnd))
  const next30 = jobs.filter(
    (j) => j.status !== 'complete' && j.startDate > today && j.startDate <= addDays(today, 30),
  )
  const attention = jobs
    .filter((j) => board.issues(j).length)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
  const toInvoice = jobs.filter((j) => j.status === 'complete' && !j.paperwork.invoice)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <PageHead
        eyebrow={now.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        title={greeting}
        actions={
          <button type="button" className="btn primary" onClick={() => drawers.newJob()}>
            {Icon.plus}New job
          </button>
        }
      />

      <div className="kpis">
        <Kpi
          to="/planner"
          icon={Icon.calendar}
          tone="i-blue"
          label="This week"
          value={thisWeek.length}
          note={`${thisWeek.filter((j) => j.status === 'complete').length} completed so far`}
        />
        <Kpi
          to="/jobs"
          filter="open"
          icon={Icon.clock}
          tone="i-amber"
          label="Next 30 days"
          value={next30.length}
          note={`${new Set(next30.map((j) => j.customerId)).size} customers booked`}
        />
        <Kpi
          to="/jobs"
          filter="attention"
          icon={Icon.alert}
          tone="i-red"
          label="Need attention"
          value={attention.length}
          alert={attention.length > 0}
          note={attention.length ? 'Status or paperwork to sort' : 'All clear'}
        />
        <Kpi
          to="/jobs"
          filter="invoice"
          icon={Icon.pound}
          tone="i-green"
          label="To invoice"
          value={toInvoice.length}
          alert={toInvoice.length > 0}
          note={toInvoice.length ? 'Completed, not invoiced' : 'Nothing waiting'}
        />
      </div>

      <div className="today-grid">
        <div className="card">
          <div className="panel-head">
            <h2>This week</h2>
            <span className="muted">
              {shortDate(weekStart)} – {shortDate(weekEnd)}
            </span>
            <Link className="link" to="/planner">
              Open planner →
            </Link>
          </div>
          <div className="agenda">
            {Array.from({ length: 7 }, (_, i) => (
              <AgendaDay key={i} date={addDays(weekStart, i)} jobs={jobs} board={board} />
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="panel-head">
              <h2>Needs attention</h2>
              <span className="muted">{attention.length}</span>
            </div>
            <div className="att">
              {attention.length === 0 ? (
                <div className="empty" style={{ padding: '28px 10px' }}>
                  <b>All clear</b>No jobs need attention.
                </div>
              ) : (
                <>
                  {attention.slice(0, 6).map((j) => (
                    <button key={j.id} type="button" className="att-item" onClick={() => drawers.openJob(j.id)}>
                      <span className="w" />
                      <div style={{ minWidth: 0 }}>
                        <div className="t">{board.customerName(j.customerId)}</div>
                        <div className="s">
                          {jobTitle(j)} · {dateRange(j)}
                        </div>
                        <div className="why">{board.issues(j)[0]}</div>
                      </div>
                    </button>
                  ))}
                  {attention.length > 6 && (
                    <Link className="att-more" to="/jobs" search={{ filter: 'attention' } as never}>
                      See all {attention.length}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
          <PaperworkRing jobs={jobs} year={today.slice(0, 4)} />
          <WorkAhead jobs={jobs} today={today} />
        </div>
      </div>
    </>
  )
}

function Kpi(props: {
  to: string
  filter?: string
  icon: ReactElement
  tone: string
  label: string
  value: number
  note: string
  alert?: boolean
}) {
  return (
    <Link
      to={props.to}
      search={(props.filter ? { filter: props.filter } : {}) as never}
      className={`card kpi ${props.alert ? 'alert' : ''}`}
    >
      <div className="kpi-top">
        <span className={`kpi-ico ${props.tone}`}>{props.icon}</span>
        {props.label}
      </div>
      <b>{props.value}</b>
      <small>{props.note}</small>
    </Link>
  )
}

function AgendaDay({ date, jobs, board }: { date: string; jobs: Job[]; board: Board }) {
  const drawers = useDrawers()
  const isToday = date === board.today
  const dayJobs = jobs
    .filter((j) => overlaps(j.startDate, j.endDate, date, date))
    .sort((a, b) => board.customerName(a.customerId).localeCompare(board.customerName(b.customerId)))

  return (
    <div className={`ag-day ${isToday ? 'is-today' : ''}`}>
      <div className="ag-date">
        <span>{isToday ? 'Today' : weekday(date)}</span>
        <b className="num">{Number(date.slice(8))}</b>
      </div>
      <div className="ag-list">
        {dayJobs.length === 0 && <div className="ag-empty">Nothing booked</div>}
        {dayJobs.map((j) => (
          <button
            key={j.id}
            type="button"
            className={`ag-item ${STATUS_CLASS[j.status]}`}
            onClick={() => drawers.openJob(j.id)}
          >
            <span className="bar" />
            <div style={{ minWidth: 0 }}>
              <div className="t">{board.customerName(j.customerId)}</div>
              <div className="s">
                {jobTitle(j)}
                {j.startDate !== j.endDate &&
                  ` · ${daysBetween(j.startDate, date) + 1}/${daysBetween(j.startDate, j.endDate) + 1} days`}
              </div>
            </div>
            <div className="r">
              {j.hotel && <span className="tag-pill">Hotel</span>}
              <CrewAvatars names={j.crewIds.map(board.memberName)} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function PaperworkRing({ jobs, year }: { jobs: Job[]; year: string }) {
  const done = jobs.filter((j) => j.status === 'complete' && j.startDate.startsWith(year))
  const complete = done.filter((j) => PAPERWORK.every((k) => j.paperwork[k])).length
  const pct = done.length ? Math.round((complete / done.length) * 100) : 0
  const missing = PAPERWORK.map((k) => ({
    label: PAPERWORK_LABELS[k],
    count: done.filter((j) => !j.paperwork[k]).length,
  })).filter((m) => m.count > 0)
  const circumference = 2 * Math.PI * 40

  return (
    <div className="card">
      <div className="panel-head">
        <h2>Paperwork</h2>
        <span className="muted">{year} completed jobs</span>
      </div>
      <div className="ring-wrap">
        <svg className="ring-chart" viewBox="0 0 100 100" role="img" aria-label={`${pct}% fully papered`}>
          <circle className="track" cx="50" cy="50" r="40" />
          <circle
            className="val"
            cx="50"
            cy="50"
            r="40"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="57" textAnchor="middle">
            {pct}%
          </text>
        </svg>
        <div className="ring-legend">
          <div>
            <span>Fully papered</span>
            <b className="num">
              {complete} / {done.length}
            </b>
          </div>
          {missing.slice(0, 4).map((m) => (
            <div key={m.label}>
              <span className="muted">Missing {m.label.toLowerCase()}</span>
              <b className="num">{m.count}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WorkAhead({ jobs, today }: { jobs: Job[]; today: string }) {
  const counts = new Map<string, number>()
  for (const j of jobs)
    if (j.startDate >= today && j.startDate <= addDays(today, 90)) {
      const kinds = j.machines.length ? j.machines.map((m) => m.type) : [jobService(j)]
      for (const kind of new Set(kinds)) counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const max = top[0]?.[1] ?? 1

  return (
    <div className="card">
      <div className="panel-head">
        <h2>Work ahead</h2>
        <span className="muted">Next 90 days</span>
      </div>
      <div className="mix">
        {top.length === 0 && <div className="muted">Nothing booked yet.</div>}
        {top.map(([kind, n]) => (
          <div key={kind} className="mix-row">
            <span className="lbl">{kind}</span>
            <span className="v num">{n}</span>
            <div className="track">
              <div className="fill" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
