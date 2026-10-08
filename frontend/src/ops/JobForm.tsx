import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createJob,
  createJobAssignment,
  deleteJob,
  deleteJobAssignment,
  getCustomerMachines,
  updateJob,
  updateJobAssignmentRole,
} from '@/lib/api'
import { JOB_COLOURS, JOB_COLOUR_CONFIG, JOB_TYPES, JOB_TYPE_LABELS, suggestJobColour } from '@/lib/v1/jobs'
import {
  COLOUR_HUES,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  PAPERWORK,
  PAPERWORK_LABELS,
  STATUS_CLASS,
  customerTypeLabel,
  jobService,
  useBoard,
} from './board'
import type { Job, JobColour, JobStatus, PaperworkItem } from './board'
import { useDrawers } from './drawers'
import { Icon } from './icons'
import { NORMAL_PAY_RATE, updatePreview } from './preview'
import { Avatar, ConfirmDelete, Drawer, Segmented, useToast } from './ui'

type Draft = {
  customerId: number | null
  startDate: string
  endDate: string
  status: JobStatus
  colour: JobColour | null
  type: Job['type']
  hotel: boolean
  machineIds: number[]
  crewIds: string[]
  leadId: string | null
  paperwork: Record<PaperworkItem, boolean>
  payRate: string
  travelDays: number
  bonuses: Record<string, number>
}

const EMPTY_PAPERWORK = { quote: false, rams: false, po: false, report: false, invoice: false }

export function JobForm({
  jobId,
  preset,
}: {
  jobId: number | null
  preset: { date: string | null; crewId: string | null }
}) {
  const board = useBoard()
  const drawers = useDrawers()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const job = jobId ? board.jobs.find((j) => j.id === jobId) : undefined
  const [draft, setDraft] = useState<Draft>(() =>
    job
      ? { ...job, machineIds: job.machines.map((m) => m.id) }
      : {
          customerId: null,
          startDate: preset.date ?? '',
          endDate: preset.date ?? '',
          status: 'planning',
          colour: null,
          type: null,
          hotel: false,
          machineIds: [],
          crewIds: preset.crewId ? [preset.crewId] : [],
          leadId: preset.crewId,
          paperwork: EMPTY_PAPERWORK,
          payRate: NORMAL_PAY_RATE,
          travelDays: 0,
          bonuses: {},
        },
  )
  const [leadPicked, setLeadPicked] = useState(Boolean(job?.leadId))
  const [error, setError] = useState('')

  const customer = draft.customerId ? board.customer(draft.customerId) : undefined
  const machines = useQuery({
    queryKey: ['customers', draft.customerId, 'machines'],
    queryFn: () => getCustomerMachines(draft.customerId!),
    enabled: !job && customer?.type === 'industrial',
  })

  if (jobId && !job) {
    return (
      <Drawer eyebrow="Job" title="Job not found" onClose={drawers.close} footer={null}>
        <p className="muted">It may have been deleted by someone else.</p>
      </Drawer>
    )
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const customers = [...board.customers].sort((a, b) => a.name.localeCompare(b.name))
  const crewChoices = board.team.filter((m) => m.active || draft.crewIds.includes(m.id))
  const issues = job ? board.issues(job) : []
  const machineChoices = machines.data ?? []
  const machinesLeft = machineChoices.filter((m) => !draft.machineIds.includes(m.id))
  const machineName = (m: { type: string; location: string | null }) =>
    m.location ? `${m.type} (${m.location})` : m.type
  const colour =
    draft.colour ??
    (draft.startDate
      ? suggestJobColour(board.jobs, draft.startDate, draft.endDate || draft.startDate)
      : 'blue')

  const toggleCrew = (id: string, on: boolean) => {
    const crewIds = on ? [...draft.crewIds, id] : draft.crewIds.filter((c) => c !== id)
    const kept = draft.leadId && crewIds.includes(draft.leadId) ? draft.leadId : null
    const leadId = crewIds.length === 1 ? crewIds[0] : leadPicked && kept ? kept : null
    if (!leadId) setLeadPicked(false)
    set({ crewIds, leadId })
  }

  const saveCrew = async (target: Job) => {
    const old = target.crew
    if (draft.leadId) {
      const existing = old.find((c) => c.userId === draft.leadId)
      if (!existing) {
        await createJobAssignment({ jobId: target.id, userId: draft.leadId, role: 'lead' })
      } else if (existing.role !== 'lead' && existing.assignmentId) {
        await updateJobAssignmentRole(existing.assignmentId, 'lead')
      }
    }
    for (const userId of draft.crewIds) {
      if (userId === draft.leadId || old.some((c) => c.userId === userId)) continue
      await createJobAssignment({ jobId: target.id, userId, role: 'member' })
    }
    const removed = old
      .filter((c) => !draft.crewIds.includes(c.userId) && c.assignmentId)
      .sort((a, b) => (a.role === 'lead' ? 1 : 0) - (b.role === 'lead' ? 1 : 0))
    for (const c of removed) await deleteJobAssignment(c.assignmentId!)
  }

  const savePreview = (id: number) =>
    updatePreview((p) => ({
      ...p,
      jobs: {
        ...p.jobs,
        [id]: {
          payRate: draft.payRate,
          travelDays: draft.travelDays,
          bonuses: Object.fromEntries(
            Object.entries(draft.bonuses).filter(([uid, pence]) => pence > 0 && draft.crewIds.includes(uid)),
          ),
        },
      },
    }))

  const submit = async () => {
    if (!draft.customerId) return setError('Pick a customer.')
    if (!draft.startDate) return setError('Add a start date.')
    const endDate = draft.endDate || draft.startDate
    if (endDate < draft.startDate) return setError('The end date is before the start date.')
    if (customer?.type === 'school' && !draft.type) return setError('Pick a job type.')
    if (!job && customer?.type === 'industrial' && !draft.machineIds.length)
      return setError('Add at least one machine.')
    if (draft.crewIds.length > 0 && !draft.leadId) return setError('Tap Lead next to the team leader.')

    setSaving(true)
    setError('')
    try {
      if (job) {
        await updateJob(job.id, {
          startDate: draft.startDate,
          endDate,
          status: draft.status,
          colour,
          hotel: draft.hotel,
          ...(customer?.type === 'school' ? { type: draft.type } : {}),
          ...draft.paperwork,
        })
        await saveCrew(job)
        savePreview(job.id)
      } else {
        const created = await createJob({
          customerId: draft.customerId,
          startDate: draft.startDate,
          endDate,
          colour,
          type: customer?.type === 'school' ? draft.type : null,
          hotel: draft.hotel,
          machineIds: customer?.type === 'industrial' ? draft.machineIds : [],
          assignees: draft.crewIds.map((userId) => ({
            userId,
            role: userId === draft.leadId ? 'lead' : 'member',
          })),
        })
        savePreview(created.id)
      }
      await queryClient.invalidateQueries({ queryKey: ['jobs'] })
      drawers.close()
      toast(job ? 'Job saved' : 'Job booked')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      await queryClient.invalidateQueries({ queryKey: ['jobs'] })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!job) return
    try {
      await deleteJob(job.id)
      await queryClient.invalidateQueries({ queryKey: ['jobs'] })
      drawers.close()
      toast('Job deleted')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <Drawer
      eyebrow={job ? jobService(job) : 'New job'}
      title={job ? board.customerName(job.customerId) : 'Book a job'}
      onClose={drawers.close}
      onSubmit={submit}
      footer={
        <>
          {job && <ConfirmDelete label="Delete" onConfirm={remove} />}
          <span className="spacer" />
          {job && (
            <Link className="btn" to="/jobs/$jobId" params={{ jobId: String(job.id) }}>
              Full page
            </Link>
          )}
          <button type="button" className="btn" onClick={drawers.close}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {job ? 'Save changes' : 'Book job'}
          </button>
        </>
      }
    >
      <fieldset className="plain">
        {issues.length > 0 && (
          <div className="flag-box">
            {issues.map((x) => (
              <div key={x} className="flag">
                {x}
              </div>
            ))}
          </div>
        )}

        <div className="sec">
          <div className="sec-t">Status</div>
          <div className="status-pick">
            {JOB_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                data-s={STATUS_CLASS[s]}
                aria-pressed={draft.status === s}
                onClick={() => set({ status: s })}
                disabled={!job && s !== 'planning'}
              >
                {JOB_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="sec">
          <div className="sec-t">Details</div>
          <div className="field">
            <label htmlFor="f-cust">Customer</label>
            {job ? (
              <div className="input readonly">
                {board.customerName(job.customerId)}
                {customer && <span className="muted"> · {customerTypeLabel(customer.type)}</span>}
              </div>
            ) : (
              <select
                id="f-cust"
                className="select"
                value={draft.customerId ?? ''}
                onChange={(e) =>
                  set({
                    customerId: e.target.value ? Number(e.target.value) : null,
                    machineIds: [],
                    type: null,
                  })
                }
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {customerTypeLabel(c.type)}
                  </option>
                ))}
              </select>
            )}
          </div>
          {customer?.type === 'school' && (
            <div className="field">
              <span className="lbl">Job type</span>
              <Segmented
                label="Job type"
                value={draft.type ?? ''}
                onChange={(type) => set({ type: type || null })}
                options={JOB_TYPES.map((t) => ({ value: t, label: JOB_TYPE_LABELS[t] }))}
              />
            </div>
          )}
          <div className="two">
            <div className="field">
              <label htmlFor="f-start">Start</label>
              <input
                id="f-start"
                type="date"
                className="input"
                value={draft.startDate}
                onChange={(e) => {
                  const startDate = e.target.value
                  const endDate = !draft.endDate || draft.endDate < startDate ? startDate : draft.endDate
                  set({ startDate, endDate })
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="f-end">End</label>
              <input
                id="f-end"
                type="date"
                className="input"
                value={draft.endDate}
                onChange={(e) => set({ endDate: e.target.value })}
              />
            </div>
          </div>
          {customer?.type === 'industrial' && (
            <div className="field">
              <label htmlFor="f-mach">Machines</label>
              {job ? (
                <div className="mach-list">
                  {job.machines.map((m) => (
                    <div key={m.id} className="m">
                      <span>{machineName(m)}</span>
                    </div>
                  ))}
                </div>
              ) : machines.isPending ? (
                <span className="muted">Loading machines…</span>
              ) : !machineChoices.length ? (
                <span className="muted">No machines listed for this customer. Add them on the customer first.</span>
              ) : (
                <>
                  <select
                    id="f-mach"
                    className="select"
                    value=""
                    disabled={machinesLeft.length === 0}
                    onChange={(e) => set({ machineIds: [...draft.machineIds, Number(e.target.value)] })}
                  >
                    <option value="">{machinesLeft.length ? 'Add a machine…' : 'All machines added'}</option>
                    {machinesLeft.map((m) => (
                      <option key={m.id} value={m.id}>
                        {machineName(m)}
                      </option>
                    ))}
                  </select>
                  {draft.machineIds.length > 0 && (
                    <div className="mach-list">
                      {machineChoices
                        .filter((m) => draft.machineIds.includes(m.id))
                        .map((m) => (
                          <div key={m.id} className="m">
                            <span>{machineName(m)}</span>
                            <button
                              type="button"
                              className="btn icon ghost"
                              aria-label={`Remove ${machineName(m)}`}
                              onClick={() => set({ machineIds: draft.machineIds.filter((id) => id !== m.id) })}
                            >
                              {Icon.close}
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <div className="field">
            <span className="lbl">Colour on the planner</span>
            <div className="swatches" role="group" aria-label="Job colour">
              {JOB_COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={JOB_COLOUR_CONFIG[c].label}
                  aria-label={JOB_COLOUR_CONFIG[c].label}
                  aria-pressed={colour === c}
                  style={{ ['--h' as string]: COLOUR_HUES[c] }}
                  onClick={() => set({ colour: c })}
                />
              ))}
            </div>
          </div>
          <div className="togs">
            <label className="tog">
              <input type="checkbox" checked={draft.hotel} onChange={(e) => set({ hotel: e.target.checked })} />
              <span className="box" />
              Hotel stay
            </label>
          </div>
        </div>

        <div className="sec">
          <div className="sec-t">Crew</div>
          {draft.crewIds.length > 0 && !draft.leadId && (
            <div className={job ? 'muted' : 'flag'}>
              {job ? 'No team leader set. ' : ''}Tap Lead next to the team leader.
            </div>
          )}
          <div className="crew">
            {crewChoices.length === 0 && <span className="muted">Nobody on the team yet.</span>}
            {crewChoices.map((m) => {
              const on = draft.crewIds.includes(m.id)
              return (
                <div key={m.id} className="crew-row">
                  <label>
                    <input type="checkbox" checked={on} onChange={(e) => toggleCrew(m.id, e.target.checked)} />
                    <Avatar name={m.name} />
                    {m.name}
                  </label>
                  {on && (
                    <label className="bonus" title="Bonus for this job, paid on top of day pay (preview)">
                      <span className="hide-phone">Bonus</span> £
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0"
                        aria-label={`Bonus for ${m.name}`}
                        defaultValue={(draft.bonuses[m.id] ?? 0) / 100 || ''}
                        onChange={(e) =>
                          set({ bonuses: { ...draft.bonuses, [m.id]: Math.round(Number(e.target.value) * 100) } })
                        }
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="lead-btn"
                    aria-pressed={draft.leadId === m.id}
                    disabled={!on}
                    onClick={() => {
                      setLeadPicked(true)
                      set({ leadId: m.id })
                    }}
                  >
                    {Icon.crown}Lead
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="sec">
          <div className="sec-t">
            Pay <span className="preview-tag">Preview</span>
          </div>
          <div className="field">
            <span className="lbl">Pay rate</span>
            <Segmented
              label="Pay rate"
              value={draft.payRate}
              onChange={(payRate) => set({ payRate })}
              options={board.payRates
                .filter((r) => !r.archived || r.id === draft.payRate)
                .map((r) => ({ value: r.id, label: r.name }))}
            />
          </div>
          <div className="field">
            <label htmlFor="f-travel">Travel days (each crew member is paid travel day pay)</label>
            <input
              id="f-travel"
              className="input"
              type="number"
              min="0"
              max="30"
              inputMode="numeric"
              value={draft.travelDays}
              onChange={(e) => set({ travelDays: Math.max(0, Math.round(Number(e.target.value))) })}
              style={{ width: 100 }}
            />
          </div>
          <div className="muted" style={{ fontSize: 12.5 }}>
            Pay rate, travel days and bonuses are kept in this browser only. Skyminer's database has no
            pay fields yet.
          </div>
        </div>

        <div className="sec">
          <div className="sec-t">Paperwork</div>
          <div className="togs">
            {PAPERWORK.map((k) => (
              <label key={k} className="tog">
                <input
                  type="checkbox"
                  checked={draft.paperwork[k]}
                  onChange={(e) => set({ paperwork: { ...draft.paperwork, [k]: e.target.checked } })}
                  disabled={!job}
                />
                <span className="box" />
                {PAPERWORK_LABELS[k]}
              </label>
            ))}
          </div>
          {!job && <div className="muted" style={{ fontSize: 12.5 }}>Paperwork can be ticked once the job is booked.</div>}
        </div>
      </fieldset>

      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
    </Drawer>
  )
}
