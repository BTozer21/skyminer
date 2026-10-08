import { useState } from 'react'

import { customerTypeLabel, useBoard } from '../board'
import type { Customer } from '../board'
import { shortDate } from '../dates'
import { useDrawers } from '../drawers'
import { Icon } from '../icons'
import { Avatar, Empty, PageHead, Segmented } from '../ui'

export function CustomersPage() {
  const board = useBoard()
  const drawers = useDrawers()
  const [type, setType] = useState<Customer['type'] | 'all'>('all')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const list = board.customers
    .filter((c) => type === 'all' || c.type === type)
    .filter((c) => !q || [c.name, c.postcode, customerTypeLabel(c.type)].join(' ').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <PageHead
        eyebrow={`${list.length} of ${board.customers.length} customers`}
        title="Customers"
        actions={
          <button type="button" className="btn primary" onClick={() => drawers.openCustomer('new')}>
            {Icon.plus}New customer
          </button>
        }
      />
      <div className="toolbar">
        <Segmented
          label="Type"
          value={type}
          onChange={setType}
          options={(['all', 'industrial', 'school'] as const).map((t) => ({
            value: t,
            label: (
              <>
                {t === 'all' ? 'All' : customerTypeLabel(t)}
                <span className="c num">
                  {t === 'all' ? board.customers.length : board.customers.filter((c) => c.type === t).length}
                </span>
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
            placeholder="Search customers"
            aria-label="Search customers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {board.customers.length === 0 ? (
        <Empty title="No customers yet">Add a customer and their machines so jobs can be booked against them.</Empty>
      ) : list.length === 0 ? (
        <Empty title="Nothing matches">Try another search.</Empty>
      ) : (
        <div className="grid-cards">
          {list.map((c) => {
            const jobs = board.jobs.filter((j) => j.customerId === c.id)
            const next = jobs
              .filter((j) => j.startDate >= board.today)
              .sort((a, b) => a.startDate.localeCompare(b.startDate)).at(0)
            const last = jobs
              .filter((j) => j.startDate < board.today)
              .sort((a, b) => b.startDate.localeCompare(a.startDate)).at(0)
            const machineCount = new Set(jobs.flatMap((j) => j.machines.map((m) => m.id))).size
            return (
              <button key={c.id} type="button" className="card ccard" onClick={() => drawers.openCustomer(c.id)}>
                <div className="ccard-top">
                  <Avatar name={c.name} size="lg" />
                  <div>
                    <h3>{c.name}</h3>
                    <div className="sub">{c.postcode || customerTypeLabel(c.type)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="chip-soft">{customerTypeLabel(c.type)}</span>
                  {machineCount > 0 && (
                    <span className="chip-soft">
                      {machineCount} machine{machineCount === 1 ? '' : 's'} booked
                    </span>
                  )}
                </div>
                <div className="ccard-stats">
                  <div>
                    <span>Jobs</span>
                    <b className="num">{jobs.length}</b>
                  </div>
                  <div>
                    <span>Last</span>
                    <b className="num">{last ? shortDate(last.startDate) : '—'}</b>
                  </div>
                  <div>
                    <span>Next</span>
                    <b className="num" style={next ? { color: 'var(--sk-planned)' } : undefined}>
                      {next ? shortDate(next.startDate) : '—'}
                    </b>
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
