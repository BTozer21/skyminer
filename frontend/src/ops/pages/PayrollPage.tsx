import { Fragment, useState } from 'react'

import { JOB_STATUS_LABELS, jobTitle, useBoard } from '../board'
import type { Job, TeamMember } from '../board'
import { addDays, money, monthYear, parseIsoDate, shortDate, toIsoDate, weekday } from '../dates'
import { useDrawers } from '../drawers'
import { Icon } from '../icons'
import { NORMAL_PAY_RATE } from '../preview'
import type { PayRate } from '../preview'
import { Avatar, Empty, PageHead, PreviewNote } from '../ui'

type PayDay = { date: string; jobIds: number[]; rate: string; payPence: number; confirmed: boolean }

type PayLine = {
  memberId: string
  days: PayDay[]
  unconfirmedDays: number
  daysPence: number
  travel: { jobId: number; days: number; pence: number }[]
  travelPence: number
  bonuses: { jobId: number; pence: number }[]
  bonusPence: number
  totalPence: number
}

function dayPayFor(rate: PayRate | undefined, member: TeamMember): number {
  if (!rate) return member.dayPayPence
  return rate.kind === 'fixed' ? rate.value : Math.round((member.dayPayPence * rate.value) / 100)
}

function payroll(jobs: Job[], team: TeamMember[], payRates: PayRate[], from: string, to: string): PayLine[] {
  const rateById = new Map(payRates.map((r) => [r.id, r]))
  const pay = (job: Job, member: TeamMember) => dayPayFor(rateById.get(job.payRate), member)

  const worked = new Map<string, Map<string, Job[]>>()
  for (const job of jobs) {
    const first = job.startDate > from ? job.startDate : from
    const last = job.endDate < to ? job.endDate : to
    for (let date = first; date <= last; date = addDays(date, 1)) {
      for (const memberId of job.crewIds) {
        const days = worked.get(memberId) ?? new Map<string, Job[]>()
        days.set(date, [...(days.get(date) ?? []), job])
        worked.set(memberId, days)
      }
    }
  }

  return team.flatMap((member) => {
    if (member.paidSeparately) return []
    const days: PayDay[] = [...(worked.get(member.id) ?? [])]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayJobs]) => {
        const best = dayJobs.reduce((a, b) => (pay(b, member) > pay(a, member) ? b : a))
        return {
          date,
          jobIds: dayJobs.map((j) => j.id),
          rate: best.payRate,
          payPence: pay(best, member),
          confirmed: dayJobs.some((j) => j.status === 'complete'),
        }
      })
    const startedHere = jobs.filter(
      (j) => j.startDate >= from && j.startDate <= to && j.crewIds.includes(member.id),
    )
    const travel = startedHere
      .filter((j) => j.travelDays > 0)
      .map((j) => ({ jobId: j.id, days: j.travelDays, pence: j.travelDays * member.travelDayPayPence }))
    const bonuses = startedHere
      .map((j) => ({ jobId: j.id, pence: j.bonuses[member.id] ?? 0 }))
      .filter((b) => b.pence > 0)
    if (!days.length && !travel.length && !bonuses.length) return []

    const daysPence = days.reduce((n, d) => n + d.payPence, 0)
    const travelPence = travel.reduce((n, t) => n + t.pence, 0)
    const bonusPence = bonuses.reduce((n, b) => n + b.pence, 0)
    return [
      {
        memberId: member.id,
        days,
        unconfirmedDays: days.filter((d) => !d.confirmed).length,
        daysPence,
        travel,
        travelPence,
        bonuses,
        bonusPence,
        totalPence: daysPence + travelPence + bonusPence,
      },
    ]
  })
}

function monthRange(iso: string): [string, string] {
  const d = parseIsoDate(iso)
  return [
    toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1)),
    toIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  ]
}

const pounds = (pence: number) => (pence / 100).toFixed(2)
const daysAt = (days: PayDay[], rateId: string) => days.filter((d) => d.rate === rateId).length

function rateSummary(days: PayDay[], rates: PayRate[]) {
  return rates
    .filter((r) => r.id !== NORMAL_PAY_RATE)
    .map((r) => [daysAt(days, r.id), r.name] as const)
    .filter(([n]) => n > 0)
    .map(([n, name]) => `${n} at ${name}`)
    .join(' · ')
}

export function PayrollPage() {
  const board = useBoard()
  const drawers = useDrawers()
  const [month, setMonth] = useState(() => monthRange(board.today)[0])
  const [open, setOpen] = useState<string | null>(null)

  const [from, to] = monthRange(month)
  const rates = board.payRates
  const lines = payroll(board.jobs, board.team, rates, from, to)
  const ratesUsed = rates.filter((r) => r.id !== NORMAL_PAY_RATE && lines.some((l) => daysAt(l.days, r.id) > 0))
  const jobById = new Map(board.jobs.map((j) => [j.id, j]))
  const member = (id: string) => board.member(id)!
  const total = lines.reduce((n, l) => n + l.totalPence, 0)
  const days = lines.reduce((n, l) => n + l.days.length, 0)
  const bonuses = lines.reduce((n, l) => n + l.bonusPence, 0)
  const travel = lines.reduce((n, l) => n + l.travelPence, 0)
  const separate = board.team.filter(
    (m) => m.paidSeparately && board.jobs.some((j) => j.crewIds.includes(m.id) && j.startDate <= to && j.endDate >= from),
  )
  const unconfirmed = lines.reduce((n, l) => n + l.unconfirmedDays, 0)

  const exportCsv = () => {
    const rows = [
      [
        'Name',
        'Days worked',
        ...ratesUsed.map((r) => `Days at ${r.name}`),
        'Day pay after tax',
        'Pay for days',
        'Travel days',
        'Travel pay',
        'Bonuses',
        'Total after tax',
        'Days not marked completed',
      ],
      ...lines.map((l) => [
        member(l.memberId).name,
        l.days.length,
        ...ratesUsed.map((r) => daysAt(l.days, r.id)),
        pounds(member(l.memberId).dayPayPence),
        pounds(l.daysPence),
        l.travel.reduce((n, t) => n + t.days, 0),
        pounds(l.travelPence),
        pounds(l.bonusPence),
        pounds(l.totalPence),
        l.unconfirmedDays,
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = `payroll-${from.slice(0, 7)}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  return (
    <>
      <PageHead
        eyebrow={`${monthYear(from)} · pay after tax`}
        title="Payroll"
        actions={
          <>
            <button
              type="button"
              className="btn icon"
              aria-label="Previous month"
              onClick={() => setMonth(monthRange(addDays(from, -1))[0])}
            >
              {Icon.left}
            </button>
            <button type="button" className="btn" onClick={() => setMonth(monthRange(board.today)[0])}>
              This month
            </button>
            <button type="button" className="btn icon" aria-label="Next month" onClick={() => setMonth(addDays(to, 1))}>
              {Icon.right}
            </button>
            <button type="button" className="btn" disabled={!lines.length} onClick={exportCsv}>
              Export CSV
            </button>
          </>
        }
      />

      <PreviewNote>
        Preview: days come from the real planner, but every pay figure is a placeholder kept in this
        browser (Settings › Pay and each job's Pay section). Skyminer's database has no pay tables yet.
      </PreviewNote>

      <div className="pay-summary">
        <div>
          <span>Total</span>
          <b className="num">{money(total)}</b>
        </div>
        <div>
          <span>People</span>
          <b className="num">{lines.length}</b>
        </div>
        <div>
          <span>Days worked</span>
          <b className="num">{days}</b>
        </div>
        <div>
          <span>Travel</span>
          <b className="num">{money(travel)}</b>
        </div>
        <div>
          <span>Bonuses</span>
          <b className="num">{money(bonuses)}</b>
        </div>
      </div>

      {separate.length > 0 && (
        <div className="notice">Paid separately, not included: {separate.map((m) => m.name).join(', ')}.</div>
      )}
      {unconfirmed > 0 && (
        <div className="notice">
          {unconfirmed} of these days come from jobs not marked Completed. Check they happened before paying.
        </div>
      )}

      {lines.length === 0 ? (
        <Empty title="Nobody worked this month">Days come from the crew on each job.</Empty>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th className="r">Days</th>
                  <th className="r hide-phone">Day pay</th>
                  <th className="r hide-phone">Travel</th>
                  <th className="r hide-phone">Bonus</th>
                  <th className="r">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const m = member(l.memberId)
                  const isOpen = open === l.memberId
                  return (
                    <Fragment key={l.memberId}>
                      <tr className="row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : l.memberId)}>
                        <td>
                          <div className="cust-cell pay-person">
                            <Avatar name={m.name} />
                            <span className="n">{m.name}</span>
                          </div>
                          {l.unconfirmedDays > 0 && (
                            <div className="flag">
                              {l.unconfirmedDays} day{l.unconfirmedDays === 1 ? '' : 's'} not marked completed
                            </div>
                          )}
                        </td>
                        <td className="r num">
                          {l.days.length}
                          {rateSummary(l.days, rates) && <div className="pay-premium">{rateSummary(l.days, rates)}</div>}
                        </td>
                        <td className="r num hide-phone">{money(m.dayPayPence)}</td>
                        <td className="r num hide-phone">{l.travelPence ? money(l.travelPence) : '—'}</td>
                        <td className="r num hide-phone">{l.bonusPence ? money(l.bonusPence) : '—'}</td>
                        <td className="r num">
                          <b>{money(l.totalPence)}</b>
                        </td>
                      </tr>
                      {isOpen &&
                        l.days.map((d) => (
                          <tr key={d.date} className="pay-day">
                            <td colSpan={6}>
                              <span className="mono">
                                {weekday(d.date)} {shortDate(d.date)}
                              </span>
                              {d.rate !== NORMAL_PAY_RATE && <span className="rate">{board.payRateName(d.rate)}</span>}
                              {d.jobIds.map((id) => {
                                const j = jobById.get(id)!
                                return (
                                  <button key={id} type="button" onClick={() => drawers.openJob(id)}>
                                    {board.customerName(j.customerId)} · {jobTitle(j)}
                                    {j.status !== 'complete' && <i className="muted"> ({JOB_STATUS_LABELS[j.status]})</i>}
                                  </button>
                                )
                              })}
                            </td>
                          </tr>
                        ))}
                      {isOpen &&
                        l.travel.map((t) => {
                          const j = jobById.get(t.jobId)!
                          return (
                            <tr key={`travel-${t.jobId}`} className="pay-day">
                              <td colSpan={6}>
                                <span className="mono">Travel</span>
                                <button type="button" onClick={() => drawers.openJob(t.jobId)}>
                                  {board.customerName(j.customerId)} · {t.days} day{t.days === 1 ? '' : 's'}
                                </button>
                                <b className="num">{money(t.pence)}</b>
                              </td>
                            </tr>
                          )
                        })}
                      {isOpen &&
                        l.bonuses.map((b) => {
                          const j = jobById.get(b.jobId)!
                          return (
                            <tr key={`bonus-${b.jobId}`} className="pay-day">
                              <td colSpan={6}>
                                <span className="mono">Bonus</span>
                                <button type="button" onClick={() => drawers.openJob(b.jobId)}>
                                  {board.customerName(j.customerId)} · {jobTitle(j)}
                                </button>
                                <b className="num">{money(b.pence)}</b>
                              </td>
                            </tr>
                          )
                        })}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="legend">
        <span>
          A day counts once however many jobs that day, at whichever job pays most. Travel days and
          bonuses are paid in the month the job starts. Tap a person to see their days.
        </span>
      </div>
    </>
  )
}
