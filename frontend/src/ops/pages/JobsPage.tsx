import { Fragment, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { updateJob } from '@/lib/api'
import { PAPERWORK, PAPERWORK_LABELS, boardJobsQuery, customerTypeLabel, jobService, jobTitle, useBoard } from '../board'
import type { Board, Job, PaperworkItem } from '../board'
import { dateRange, monthYear } from '../dates'
import { useDrawers, useSearchParams } from '../drawers'
import { Icon } from '../icons'
import { Avatar, CrewAvatars, Empty, PageHead, Segmented, StatusPill, useToast } from '../ui'

const FILTERS = {
  open: { label: 'Open', test: (j: Job) => j.status !== 'complete' },
  attention: { label: 'Attention', test: (j: Job, b: Board) => b.issues(j).length > 0 },
  invoice: { label: 'To invoice', test: (j: Job) => j.status === 'complete' && !j.paperwork.invoice },
  done: { label: 'Completed', test: (j: Job) => j.status === 'complete' },
  all: { label: 'All', test: () => true },
} satisfies Record<string, { label: string; test: (j: Job, b: Board) => boolean }>
type Filter = keyof typeof FILTERS

const PAPERWORK_SHORT: Record<PaperworkItem, string> = {
  quote: 'Q',
  rams: 'RA',
  po: 'PO',
  report: 'RP',
  invoice: 'INV',
}

export function JobsPage() {
  const board = useBoard()
  const drawers = useDrawers()
  const [params, setParams] = useSearchParams()
  const filter: Filter = params.filter && params.filter in FILTERS ? (params.filter as Filter) : 'open'
  const kind = params.kind ?? ''
  const [query, setQuery] = useState('')

  const setParam = (changes: Record<string, string>) =>
    setParams((prev) => {
      const p = { ...prev }
      Object.entries(changes).forEach(([k, v]) => (p[k] = v || undefined))
      return p
    })

  const kinds = [...new Set(board.jobs.map(jobService))].sort()
  const q = query.trim().toLowerCase()
  const list = board.jobs
    .filter((j) => FILTERS[filter].test(j, board))
    .filter((j) => !kind || jobService(j) === kind)
    .filter(
      (j) =>
        !q ||
        [board.customerName(j.customerId), jobTitle(j), jobService(j)].join(' ').toLowerCase().includes(q),
    )
    .sort((a, b) =>
      filter === 'open' ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate),
    )

  return (
    <>
      <PageHead
        eyebrow={`${list.length} of ${board.jobs.length} jobs`}
        title="Jobs"
        actions={
          <button type="button" className="btn primary" onClick={() => drawers.newJob()}>
            {Icon.plus}New job
          </button>
        }
      />
      <div className="toolbar">
        <Segmented
          label="Filter jobs"
          value={filter}
          onChange={(f) => setParam({ filter: f })}
          options={(Object.keys(FILTERS) as Filter[]).map((f) => ({
            value: f,
            label: (
              <>
                {FILTERS[f].label}
                <span className="c num">{board.jobs.filter((j) => FILTERS[f].test(j, board)).length}</span>
              </>
            ),
          }))}
        />
        <span className="spacer" />
        <label className="search-field">
          {Icon.search}
          <input
            type="search"
            className="input"
            placeholder="Search jobs"
            aria-label="Search jobs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          className="select"
          aria-label="Filter by kind of work"
          value={kind}
          onChange={(e) => setParam({ kind: e.target.value })}
        >
          <option value="">All kinds</option>
          {kinds.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>

      {board.jobs.length === 0 ? (
        <Empty title="No jobs yet">Add your first job, or click a day on the Planner.</Empty>
      ) : list.length === 0 ? (
        <Empty title="Nothing matches">Try another filter or search.</Empty>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Job</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Crew</th>
                  <th>Paperwork</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {list.map((j, i) => {
                  const month = j.startDate.slice(0, 7)
                  const firstOfMonth = i === 0 || list[i - 1].startDate.slice(0, 7) !== month
                  return (
                    <Fragment key={j.id}>
                      {firstOfMonth && (
                        <MonthRow date={j.startDate} count={list.filter((x) => x.startDate.startsWith(month)).length} />
                      )}
                      <JobRow job={j} board={board} />
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function MonthRow({ date, count }: { date: string; count: number }) {
  return (
    <tr className="month">
      <td colSpan={7}>
        {monthYear(date)}
        <span>
          {count} job{count === 1 ? '' : 's'}
        </span>
      </td>
    </tr>
  )
}

function JobRow({ job: j, board }: { job: Job; board: Board }) {
  const drawers = useDrawers()
  const toast = useToast()
  const queryClient = useQueryClient()
  const customerName = board.customerName(j.customerId)
  const customer = board.customer(j.customerId)
  const sub = [customer ? customerTypeLabel(customer.type) : '', j.hotel ? 'Hotel' : ''].filter(Boolean).join(' · ')

  const toggle = async (item: PaperworkItem, value: boolean) => {
    queryClient.setQueryData(boardJobsQuery.queryKey, (jobs: { id: number }[] | undefined) =>
      jobs?.map((x) => (x.id === j.id ? { ...x, [item]: value } : x)),
    )
    try {
      await updateJob(j.id, { [item]: value })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save')
    }
    queryClient.invalidateQueries({ queryKey: ['jobs'] })
  }

  return (
    <tr className="row" onClick={() => drawers.openJob(j.id)}>
      <td>
        <div className="cust-cell">
          <Avatar name={customerName} size="sq" />
          <span className="n">{customerName}</span>
        </div>
      </td>
      <td className="job-cell">
        <div className="d">{jobTitle(j)}</div>
        {sub && <div className="s">{sub}</div>}
      </td>
      <td className="mono" style={{ whiteSpace: 'nowrap' }}>
        {dateRange(j)}
      </td>
      <td>
        <StatusPill status={j.status} />
      </td>
      <td>
        <CrewAvatars names={j.crewIds.map(board.memberName)} />
      </td>
      <td>
        <div className="pw">
          {PAPERWORK.map((k) => {
            const done = j.paperwork[k]
            const label = `${PAPERWORK_LABELS[k]} ${done ? 'done' : 'not done'}`
            return (
              <button
                key={k}
                type="button"
                aria-pressed={done}
                title={label}
                aria-label={label}
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(k, !done)
                }}
              >
                {PAPERWORK_SHORT[k]}
              </button>
            )
          })}
        </div>
      </td>
      <td>
        {board.issues(j).map((x) => (
          <div key={x} className="flag">
            {x}
          </div>
        ))}
      </td>
    </tr>
  )
}
