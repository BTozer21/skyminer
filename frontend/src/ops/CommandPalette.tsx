import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { JOB_STATUS_LABELS, customerTypeLabel, jobService, jobTitle, useBoard } from './board'
import { dateRange, daysBetween, relativeDay } from './dates'
import { useDrawers } from './drawers'
import { Icon } from './icons'
import { pagesFor } from './nav'
import { Avatar } from './ui'

type Item = {
  group: string
  title: string
  sub?: string
  icon?: ReactElement
  avatar?: string
  run: () => void
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const board = useBoard()
  const drawers = useDrawers()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  const q = query.trim().toLowerCase()
  const actions: Item[] = [
    { title: 'New job', icon: Icon.plus, run: () => drawers.newJob() },
    { title: 'New customer', icon: Icon.plus, run: () => drawers.openCustomer('new') },
    ...pagesFor(board.canEdit).map((p) => ({
      title: `Go to ${p.label}`,
      icon: p.icon,
      run: () => navigate({ to: p.to }),
    })),
  ]
    .filter((a) => !q || a.title.toLowerCase().includes(q))
    .slice(0, q ? 4 : 7)
    .map((a) => ({ ...a, group: 'Actions' }))

  const items: Item[] = [...actions]
  if (q) {
    board.customers
      .filter((c) => [c.name, c.postcode].join(' ').toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((c) =>
        items.push({
          group: 'Customers',
          title: c.name,
          sub: [customerTypeLabel(c.type), c.postcode].filter(Boolean).join(' · '),
          avatar: c.name,
          run: () => drawers.openCustomer(c.id),
        }),
      )
    board.jobs
      .filter((j) =>
        [board.customerName(j.customerId), jobTitle(j), jobService(j)]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
      .sort(
        (a, b) =>
          Math.abs(daysBetween(board.today, a.startDate)) -
          Math.abs(daysBetween(board.today, b.startDate)),
      )
      .slice(0, 7)
      .forEach((j) =>
        items.push({
          group: 'Jobs',
          title: `${board.customerName(j.customerId)} — ${jobTitle(j)}`,
          sub: `${dateRange(j)} · ${JOB_STATUS_LABELS[j.status]}`,
          icon: Icon.jobs,
          run: () => drawers.openJob(j.id),
        }),
      )
  } else {
    board.jobs
      .filter((j) => j.startDate >= board.today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 5)
      .forEach((j) =>
        items.push({
          group: 'Coming up',
          title: `${board.customerName(j.customerId)} — ${jobTitle(j)}`,
          sub: relativeDay(j.startDate),
          icon: Icon.calendar,
          run: () => drawers.openJob(j.id),
        }),
      )
  }

  const current = Math.min(selected, Math.max(0, items.length - 1))
  const run = (item: Item | undefined) => {
    if (!item) return
    onClose()
    item.run()
  }

  useEffect(() => {
    document.querySelector(`[data-pal="${current}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [current])

  return (
    <div className="pal-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pal" role="dialog" aria-label="Search">
        <div className="pal-in">
          {Icon.search}
          <input
            autoFocus
            placeholder="Search jobs, customers, or type a command…"
            autoComplete="off"
            aria-label="Search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              else if (e.key === 'ArrowDown') setSelected(Math.min(items.length - 1, current + 1))
              else if (e.key === 'ArrowUp') setSelected(Math.max(0, current - 1))
              else if (e.key === 'Enter') run(items[current])
              else return
              e.preventDefault()
            }}
          />
        </div>
        <div className="pal-list" role="listbox">
          {items.length === 0 && (
            <div className="empty" style={{ padding: 30 }}>
              <b>No results</b>Try a customer, postcode or machine.
            </div>
          )}
          {items.map((it, i) => (
            <div key={i}>
              {it.group !== items[i - 1]?.group && <div className="pal-group">{it.group}</div>}
              <button
                type="button"
                className="pal-item"
                role="option"
                data-pal={i}
                aria-selected={i === current}
                onClick={() => run(it)}
              >
                {it.avatar ? <Avatar name={it.avatar} size="sq" /> : <span className="ico">{it.icon}</span>}
                <div>
                  <div className="t">{it.title}</div>
                  {it.sub && <div className="s">{it.sub}</div>}
                </div>
              </button>
            </div>
          ))}
        </div>
        <div className="pal-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>move
          </span>
          <span>
            <kbd>↵</kbd>open
          </span>
          <span>
            <kbd>esc</kbd>close
          </span>
        </div>
      </div>
    </div>
  )
}
