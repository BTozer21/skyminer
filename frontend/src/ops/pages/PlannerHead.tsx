import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { addDays, mondayOf } from '../dates'
import { Icon } from '../icons'
import { PageHead, Segmented } from '../ui'

export function PlannerHead({
  mode,
  title,
  eyebrow,
  actions,
}: {
  mode: 'grid' | 'employee' | 'map'
  title: ReactNode
  eyebrow: ReactNode
  actions?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <PageHead
      eyebrow={eyebrow}
      title={title}
      actions={
        <>
          <Segmented
            label="Planner view"
            value={mode}
            onChange={(m) => navigate({ to: m === 'grid' ? '/planner' : `/planner/${m}` })}
            options={[
              { value: 'grid', label: <>{Icon.team}Team grid</> },
              { value: 'employee', label: <>{Icon.today}Employee view</> },
              { value: 'map', label: <>{Icon.map}Map</> },
            ]}
          />
          {actions}
        </>
      }
    />
  )
}

export function WeekNav({
  start,
  today,
  onChange,
}: {
  start: string
  today: string
  onChange: (monday: string) => void
}) {
  return (
    <>
      <button type="button" className="btn icon" aria-label="Previous week" onClick={() => onChange(addDays(start, -7))}>
        {Icon.left}
      </button>
      <button type="button" className="btn" onClick={() => onChange(mondayOf(today))}>
        Today
      </button>
      <button type="button" className="btn icon" aria-label="Next week" onClick={() => onChange(addDays(start, 7))}>
        {Icon.right}
      </button>
    </>
  )
}
