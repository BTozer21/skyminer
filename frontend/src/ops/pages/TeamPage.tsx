import { daysBookedInMonth, useBoard } from '../board'
import { relativeDay } from '../dates'
import { useDrawers } from '../drawers'
import { Avatar, Empty, PageHead } from '../ui'

export function TeamPage() {
  const board = useBoard()
  const drawers = useDrawers()
  const month = board.today.slice(0, 7)

  return (
    <>
      <PageHead eyebrow={`${board.team.length} people`} title="Team" />
      {board.team.length === 0 ? (
        <Empty title="No team members yet">People appear here once they have a login.</Empty>
      ) : (
        <div className="grid-cards">
          {board.team.map((m) => {
            const jobs = board.jobs.filter((j) => j.crewIds.includes(m.id))
            const next = jobs
              .filter((j) => j.endDate >= board.today)
              .sort((a, b) => a.startDate.localeCompare(b.startDate)).at(0)
            return (
              <button key={m.id} type="button" className="card ccard" onClick={() => drawers.openMember(m.id)}>
                <div className="ccard-top">
                  <Avatar name={m.name} size="lg" />
                  <div>
                    <h3>{m.name}</h3>
                    <div className="sub">
                      {m.role}
                      {!m.active && ' · Hidden from planner'}
                    </div>
                  </div>
                </div>
                <div className="sub" style={{ whiteSpace: 'normal' }}>
                  {next ? (
                    <>
                      Next: <b style={{ color: 'var(--sk-ink)' }}>{board.customerName(next.customerId)}</b> ·{' '}
                      {relativeDay(next.startDate)}
                    </>
                  ) : (
                    'Nothing booked'
                  )}
                </div>
                <div className="ccard-stats">
                  <div>
                    <span>Days this month</span>
                    <b className="num">{daysBookedInMonth(jobs, month)}</b>
                  </div>
                  <div>
                    <span>Jobs</span>
                    <b className="num">{jobs.length}</b>
                  </div>
                  <div>
                    <span>Leading</span>
                    <b className="num">{jobs.filter((j) => j.leadId === m.id).length}</b>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
