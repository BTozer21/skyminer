import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { authClient } from '@/auth'
import { machines as MACHINE_TYPES } from '@/lib/machines'
import { JOB_COLOURS, JOB_COLOUR_CONFIG, JOB_TYPES, JOB_TYPE_LABELS } from '@/lib/v1/jobs'
import { COLOUR_HUES, jobService, useBoard } from '../board'
import { money } from '../dates'
import { useSearchParams } from '../drawers'
import { NORMAL_PAY_RATE, updatePreview } from '../preview'
import type { PayRate } from '../preview'
import { Avatar, ConfirmDelete, PageHead, PreviewNote, Segmented, useToast } from '../ui'
import { ZOOM_STEPS } from './TeamGrid'

const SECTIONS = [
  { value: 'pay', label: 'Pay' },
  { value: 'lists', label: 'Lists' },
  { value: 'logins', label: 'Logins' },
  { value: 'display', label: 'Display' },
] as const
type Section = (typeof SECTIONS)[number]['value']

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const section: Section = SECTIONS.some((s) => s.value === params.section) ? (params.section as Section) : 'pay'

  return (
    <>
      <PageHead eyebrow="Company-wide · admins only" title="Settings" />
      <div className="toolbar">
        <Segmented
          label="Settings section"
          value={section}
          onChange={(s) => setParams(() => ({ section: s }))}
          options={SECTIONS.map((s) => ({ value: s.value, label: s.label }))}
        />
      </div>
      <div className="settings">
        {section === 'pay' && (
          <>
            <PreviewNote>
              Preview: pay settings are kept in this browser only, to show how Payroll would work.
              Nothing here is saved to the database.
            </PreviewNote>
            <CompanyPay />
            <PayRates />
          </>
        )}
        {section === 'lists' && <Lists />}
        {section === 'logins' && <Logins />}
        {section === 'display' && (
          <>
            <PlannerZoom />
            <MapsStatus />
          </>
        )}
      </div>
    </>
  )
}

const PAY_FIELDS = [
  ['dayPayPence', 'Day pay'],
  ['travelDayPayPence', 'Travel day pay'],
] as const

function CompanyPay() {
  const board = useBoard()
  const toast = useToast()
  const [draft, setDraft] = useState<{ dayPayPence: number; travelDayPayPence: number } | null>(null)
  const current = draft ?? board.preview

  return (
    <form
      className="card set-card"
      onSubmit={(e) => {
        e.preventDefault()
        if (!draft) return
        updatePreview((p) => ({ ...p, ...draft }))
        setDraft(null)
        toast(`Saved · day pay ${money(draft.dayPayPence)}`)
      }}
    >
      <div>
        <h2>Day pay</h2>
        <p className="muted">
          After tax, per person. People without their own rate on the Team page are paid these.
        </p>
      </div>
      <div className="set-pay">
        {PAY_FIELDS.map(([key, label]) => (
          <div key={key} className="field">
            <label htmlFor={`s-${key}`}>{label} (£)</label>
            <input
              id={`s-${key}`}
              className="input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={current[key] / 100}
              onChange={(e) =>
                setDraft({
                  dayPayPence: current.dayPayPence,
                  travelDayPayPence: current.travelDayPayPence,
                  [key]: Math.round(Number(e.target.value) * 100),
                })
              }
            />
          </div>
        ))}
      </div>
      <div>
        <button type="submit" className="btn primary" disabled={!draft}>
          Save day pay
        </button>
      </div>
    </form>
  )
}

type Kind = PayRate['kind']

const toForm = (value: number) => String(value / 100)
const fromForm = (text: string) => Math.round(Number(text) * 100)
const describe = (r: Pick<PayRate, 'kind' | 'value'>) =>
  r.kind === 'multiplier' ? `day pay × ${r.value / 100}` : `£${(r.value / 100).toFixed(2)} a day`

const savePayRate = (id: string, patch: Partial<PayRate>) =>
  updatePreview((p) => ({ ...p, payRates: p.payRates.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))

function PayRates() {
  const board = useBoard()
  const toast = useToast()
  const blank = { name: '', kind: 'multiplier' as Kind, value: '' }
  const [form, setForm] = useState(blank)
  const uses = (id: string) => board.jobs.filter((j) => j.payRate === id).length

  return (
    <div className="card set-card">
      <div>
        <h2>Pay rates</h2>
        <p className="muted">
          What a job's days pay each person on the crew: a multiple of their day pay, or a fixed amount
          a day. Pick one on each job. Normal can be renamed but not changed.
        </p>
      </div>
      <div className="list-rows">
        {board.payRates.map((r) => (
          <PayRateRow key={r.id} rate={r} used={uses(r.id)} />
        ))}
      </div>
      <form
        className="set-add"
        onSubmit={(e) => {
          e.preventDefault()
          const rate: PayRate = {
            id: crypto.randomUUID(),
            name: form.name.trim(),
            kind: form.kind,
            value: fromForm(form.value),
            archived: false,
          }
          updatePreview((p) => ({ ...p, payRates: [...p.payRates, rate] }))
          toast(`Added ${rate.name}`)
          setForm(blank)
        }}
      >
        <h3>Add a pay rate</h3>
        <div className="pay-rate-fields">
          <input
            className="input"
            placeholder="Name, e.g. Night shift"
            aria-label="Pay rate name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <KindValue kind={form.kind} value={form.value} onChange={(kind, value) => setForm({ ...form, kind, value })} />
          <button type="submit" className="btn" disabled={!form.name.trim() || !form.value}>
            Add
          </button>
        </div>
      </form>
    </div>
  )
}

function PayRateRow({ rate, used }: { rate: PayRate; used: number }) {
  const toast = useToast()
  const locked = rate.id === NORMAL_PAY_RATE
  const [draft, setDraft] = useState({ name: rate.name, kind: rate.kind, value: toForm(rate.value) })
  const dirty = draft.name !== rate.name || draft.kind !== rate.kind || fromForm(draft.value) !== rate.value

  return (
    <div className={`list-row ${rate.archived ? 'archived' : ''}`}>
      <form
        className="pay-rate-fields"
        onSubmit={(e) => {
          e.preventDefault()
          savePayRate(rate.id, { name: draft.name, kind: draft.kind, value: fromForm(draft.value) })
          toast(`Saved ${draft.name.trim()}`)
        }}
      >
        <input
          className="input"
          aria-label={`Name of ${rate.name}`}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        {locked ? (
          <span className="muted">{describe(rate)}</span>
        ) : (
          <KindValue
            kind={draft.kind}
            value={draft.value}
            onChange={(kind, value) => setDraft({ ...draft, kind, value })}
          />
        )}
        {dirty && (
          <button type="submit" className="btn">
            Save
          </button>
        )}
      </form>
      <span className="muted list-used">
        {used ? `${used} job${used === 1 ? '' : 's'}` : 'Not used'}
        {rate.archived && ' · archived'}
      </span>
      {!locked && (
        <div className="list-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              savePayRate(rate.id, { archived: !rate.archived })
              toast(rate.archived ? 'Restored' : 'Archived')
            }}
          >
            {rate.archived ? 'Restore' : 'Archive'}
          </button>
          {used === 0 && (
            <ConfirmDelete
              label="Delete"
              onConfirm={() => {
                updatePreview((p) => ({ ...p, payRates: p.payRates.filter((r) => r.id !== rate.id) }))
                toast(`Deleted ${rate.name}`)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function KindValue({
  kind,
  value,
  onChange,
}: {
  kind: Kind
  value: string
  onChange: (kind: Kind, value: string) => void
}) {
  return (
    <>
      <select
        className="select"
        aria-label="How it pays"
        value={kind}
        onChange={(e) => onChange(e.target.value as Kind, value)}
      >
        <option value="multiplier">× day pay</option>
        <option value="fixed">£ a day</option>
      </select>
      <input
        className="input pay-rate-value"
        type="number"
        min="0"
        step={kind === 'multiplier' ? '0.05' : '0.01'}
        inputMode="decimal"
        placeholder={kind === 'multiplier' ? '1.5' : '100'}
        aria-label={kind === 'multiplier' ? 'Multiplier' : 'Amount a day (£)'}
        value={value}
        onChange={(e) => onChange(kind, e.target.value)}
      />
    </>
  )
}

function FixedList({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: { name: string; used: number; noun: string; swatch?: number }[]
}) {
  return (
    <div className="card set-card">
      <div>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      <div className="list-rows">
        {items.map((item) => (
          <div key={item.name} className="list-row">
            <div className="list-name">
              {item.swatch !== undefined && (
                <span className="swatch-dot" style={{ ['--h' as string]: item.swatch }} />
              )}
              <b>{item.name}</b>
            </div>
            <span className="muted list-used">
              {item.used ? `${item.used} ${item.noun}${item.used === 1 ? '' : 's'}` : 'Not used'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Lists() {
  const board = useBoard()
  return (
    <>
      <PreviewNote>
        In fletch-test these lists can be edited here. In skyminer they're fixed in the code and the
        database, so they're shown read-only.
      </PreviewNote>
      <FixedList
        title="Customer types"
        description="How customers are grouped. School jobs pick a job type; industrial jobs pick machines."
        items={(['industrial', 'school'] as const).map((t) => ({
          name: t === 'school' ? 'School' : 'Industrial',
          used: board.customers.filter((c) => c.type === t).length,
          noun: 'customer',
        }))}
      />
      <FixedList
        title="Job types"
        description="What a school job is booked as."
        items={JOB_TYPES.map((t) => ({
          name: JOB_TYPE_LABELS[t],
          used: board.jobs.filter((j) => jobService(j) === JOB_TYPE_LABELS[t]).length,
          noun: 'job',
        }))}
      />
      <FixedList
        title="Machine types"
        description="The kinds of machine an industrial customer can have."
        items={MACHINE_TYPES.map((t) => ({
          name: t,
          used: board.jobs.filter((j) => j.machines.some((m) => m.type === t)).length,
          noun: 'job',
        }))}
      />
      <FixedList
        title="Job colours"
        description="Colours a job can have on the planner."
        items={JOB_COLOURS.map((c) => ({
          name: JOB_COLOUR_CONFIG[c].label,
          used: board.jobs.filter((j) => j.colour === c).length,
          noun: 'job',
          swatch: COLOUR_HUES[c],
        }))}
      />
    </>
  )
}

function Logins() {
  const board = useBoard()
  return (
    <div className="card set-card">
      <div>
        <h2>Logins</h2>
        <p className="muted">
          Who can sign in. Admins can see and change everything. Staff see only the jobs they're on,
          once they're planned.
        </p>
      </div>
      <div className="set-logins">
        {board.team.map((m) => (
          <LoginRow key={m.id} id={m.id} name={m.name} email={m.email} isAdmin={m.isAdmin} isMe={m.id === board.me?.id} />
        ))}
      </div>
    </div>
  )
}

function LoginRow({
  id,
  name,
  email,
  isAdmin,
  isMe,
}: {
  id: string
  name: string
  email: string
  isAdmin: boolean
  isMe: boolean
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const changeRole = async (admin: boolean) => {
    setSaving(true)
    const { error } = await authClient.admin.setRole({ userId: id, role: admin ? 'admin' : 'user' })
    setSaving(false)
    if (error) return toast(error.message ?? 'Could not change the role')
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    toast(`${name} is now ${admin ? 'an admin' : 'staff'}`)
  }

  return (
    <div className="login-row">
      <Avatar name={name} />
      <div className="who">
        <b>
          {name}
          {isMe && ' (you)'}
        </b>
        <span className="muted">{email}</span>
      </div>
      <Segmented
        label={`Role for ${name}`}
        value={isAdmin ? 'admin' : 'user'}
        onChange={(role) => !isMe && !saving && changeRole(role === 'admin')}
        options={[
          { value: 'admin', label: 'Admin' },
          { value: 'user', label: 'Staff' },
        ]}
      />
    </div>
  )
}

function PlannerZoom() {
  const board = useBoard()
  const toast = useToast()
  const [draft, setDraft] = useState<number | null>(null)
  const current = draft ?? board.preview.plannerZoom

  return (
    <form
      className="card set-card"
      onSubmit={(e) => {
        e.preventDefault()
        updatePreview((p) => ({ ...p, plannerZoom: current }))
        setDraft(null)
        toast(`Planner opens at ${current}%`)
      }}
    >
      <div>
        <h2>Planner zoom</h2>
        <p className="muted">
          How zoomed in the team grid is when it opens. Kept in this browser for the preview.
        </p>
      </div>
      <div className="inline-add">
        <select
          className="select"
          aria-label="Default planner zoom"
          value={current}
          onChange={(e) => setDraft(Number(e.target.value))}
        >
          {ZOOM_STEPS.map((z) => (
            <option key={z} value={z}>
              {z}%
            </option>
          ))}
        </select>
        <button type="submit" className="btn primary" disabled={draft === null}>
          Save
        </button>
      </div>
    </form>
  )
}

function MapsStatus() {
  const ready = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
  return (
    <div className="card set-card">
      <div>
        <h2>Google Maps</h2>
        <p className="muted">
          {ready
            ? 'Connected. The planner map is on.'
            : 'Not set up. The planner map lists jobs without drawing the map until VITE_GOOGLE_MAPS_API_KEY is added to frontend/.env.'}
        </p>
      </div>
      <div>
        <span className={`status ${ready ? 'done' : 'cancelled'}`}>{ready ? 'Connected' : 'Not set up'}</span>
      </div>
    </div>
  )
}
