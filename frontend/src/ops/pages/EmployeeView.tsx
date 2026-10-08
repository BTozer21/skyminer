import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { daysBookedInMonth, jobTitle, useBoard } from '../board'
import type { Board, Job, TeamMember } from '../board'
import { dateRange, daysBetween, overlaps, parseIsoDate } from '../dates'
import { useDrawers, useSearchParams } from '../drawers'
import { Avatar, Empty, PageHead, StatusPill } from '../ui'
import { PlannerHead } from './PlannerHead'

export function EmployeeView() {
  const board = useBoard()
  const drawers = useDrawers()
  const [params, setParams] = useSearchParams()
  const person = board.team.find((m) => m.id === params.person) ?? board.team.find((m) => m.active)

  const picker = (
    <select
      className="select"
      aria-label="Employee"
      value={person?.id ?? ''}
      onChange={(e) => setParams(() => ({ person: e.target.value }))}
    >
      {board.team.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
          {!m.active && ' (hidden)'}
        </option>
      ))}
    </select>
  )

  return (
    <>
      <PlannerHead
        mode="employee"
        title={person?.name ?? 'Employee view'}
        eyebrow="Employee view · their jobs and who they're with"
        actions={picker}
      />
      {person ? (
        <PersonWork person={person} board={board} onOpen={(j) => drawers.openJob(j.id)} />
      ) : (
        <Empty title="No team members yet">People appear here once they have a login.</Empty>
      )}
    </>
  )
}

export function MyWorkPage() {
  const board = useBoard()
  const navigate = useNavigate()
  const person = board.team.at(0)
  return (
    <>
      <PageHead eyebrow="Your jobs, once they're planned" title="My work" />
      {person && (
        <PersonWork
          person={person}
          board={board}
          onOpen={(j) => navigate({ to: '/jobs/$jobId', params: { jobId: String(j.id) } })}
        />
      )}
    </>
  )
}

function PersonWork({
  person,
  board,
  onOpen,
}: {
  person: TeamMember
  board: Board
  onOpen: (job: Job) => void
}) {
  const [allPast, setAllPast] = useState(false)
  const { today } = board
  const mine = board.jobs
    .filter((j) => j.crewIds.includes(person.id))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  const now = mine.filter((j) => overlaps(j.startDate, j.endDate, today, today))
  const upcoming = mine.filter((j) => j.startDate > today)
  const past = mine.filter((j) => j.endDate < today).reverse()
  const recent = allPast ? past : past.slice(0, 15)
  const month = today.slice(0, 7)

  const card = (j: Job) => <EmployeeJob key={j.id} job={j} person={person} board={board} onOpen={onOpen} />

  return (
    <div className="card">
      <div className="emp-head">
        <Avatar name={person.name} size="lg" />
        <div>
          <h2>{person.name}</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            {person.role}
          </div>
        </div>
        <div className="emp-stats">
          <div>
            <span>Days this month</span>
            <b>{daysBookedInMonth(mine, month)}</b>
          </div>
          <div>
            <span>Upcoming jobs</span>
            <b>{upcoming.length}</b>
          </div>
          <div>
            <span>Jobs this year</span>
            <b>{mine.filter((j) => j.startDate.startsWith(today.slice(0, 4))).length}</b>
          </div>
        </div>
      </div>
      {now.length > 0 && (
        <div className="emp-sec">
          <h3>Today</h3>
          {now.map(card)}
        </div>
      )}
      <div className="emp-sec">
        <h3>Coming up</h3>
        {upcoming.length ? (
          upcoming.map(card)
        ) : (
          <div className="muted" style={{ padding: '6px 10px 10px' }}>
            Nothing booked yet.
          </div>
        )}
      </div>
      {recent.length > 0 && (
        <div className="emp-sec">
          <h3>Recent</h3>
          {recent.map(card)}
          {past.length > recent.length && (
            <button type="button" className="btn ghost" onClick={() => setAllPast(true)}>
              Show all {past.length} past jobs
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EmployeeJob({
  job: j,
  person,
  board,
  onOpen,
}: {
  job: Job
  person: TeamMember
  board: Board
  onOpen: (job: Job) => void
}) {
  const d = parseIsoDate(j.startDate)
  const length = daysBetween(j.startDate, j.endDate) + 1
  const others = j.crewIds.filter((id) => id !== person.id)

  return (
    <button
      type="button"
      className={`ej ${overlaps(j.startDate, j.endDate, board.today, board.today) ? 'today' : ''}`}
      onClick={() => onOpen(j)}
    >
      <div className="ej-date">
        <span>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
        <b className="num">{d.getDate()}</b>
        <i>
          {d.toLocaleDateString('en-GB', { month: 'short' })}
          {length > 1 && ` · ${length}d`}
        </i>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="t">{board.customerName(j.customerId)}</div>
        <div className="s">
          {jobTitle(j)} · {dateRange(j)}
          {j.leadId === person.id && ' · Leading'}
          {j.hotel && ' · Hotel'}
        </div>
        {board.canEdit && (
          <div className="with">
            {others.length === 0 && <span className="solo">Working alone</span>}
            {others.map((id) => (
              <span key={id} className={j.leadId === id ? 'lead' : ''}>
                <Avatar name={board.memberName(id)} />
                {board.memberName(id)}
                {j.leadId === id && ' · lead'}
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <StatusPill status={j.status} />
      </div>
    </button>
  )
}
