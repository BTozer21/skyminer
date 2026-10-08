import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { authClient } from '@/auth'
import { getCustomers, getJobAssignments, listUsers, myJobsQuery } from '@/lib/api'
import type { CustomerResponse, JobResponse } from '@/lib/api'
import { JOB_TYPE_LABELS, jobTitle as skyJobTitle } from '@/lib/v1/jobs'
import { addDays, toIsoDate } from './dates'
import { NORMAL_PAY_RATE, usePreview } from './preview'
import type { PayRate } from './preview'

export type JobStatus = JobResponse['status']
export type JobColour = JobResponse['colour']

export const JOB_STATUSES: JobStatus[] = ['planning', 'planned', 'complete']

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  planning: 'Planning',
  planned: 'Planned',
  complete: 'Completed',
}

export const STATUS_CLASS: Record<JobStatus, string> = {
  planning: 'active',
  planned: 'planned',
  complete: 'done',
}

export const PAPERWORK = ['quote', 'rams', 'po', 'report', 'invoice'] as const
export type PaperworkItem = (typeof PAPERWORK)[number]
export const PAPERWORK_LABELS: Record<PaperworkItem, string> = {
  quote: 'Quote',
  rams: 'RAMS',
  po: 'PO',
  report: 'Report',
  invoice: 'Invoice',
}

export const COLOUR_HUES: Record<JobColour, number> = {
  red: 4,
  orange: 24,
  amber: 42,
  lime: 85,
  green: 140,
  teal: 172,
  cyan: 190,
  blue: 218,
  indigo: 238,
  violet: 262,
  fuchsia: 292,
  pink: 330,
}

export type Machine = { id: number; type: string; location: string | null }

export type CrewMember = { assignmentId: number | null; userId: string; role: 'lead' | 'member' }

export type Job = {
  id: number
  customerId: number
  startDate: string
  endDate: string
  status: JobStatus
  colour: JobColour
  type: JobResponse['type']
  hotel: boolean
  paperwork: Record<PaperworkItem, boolean>
  machines: Machine[]
  crew: CrewMember[]
  crewIds: string[]
  leadId: string | null
  payRate: string
  travelDays: number
  bonuses: Record<string, number>
}

export type Customer = CustomerResponse

export type TeamMember = {
  id: string
  name: string
  email: string
  isAdmin: boolean
  role: string
  active: boolean
  dayPayPence: number
  travelDayPayPence: number
  paidSeparately: boolean
}

type RawJob = Omit<JobResponse, 'customer' | 'jobMachines'> & {
  jobMachines: { machine: Machine }[]
  jobAssignments?: { id: number; userId: string; role: string }[]
}

export const jobTitle = (job: Pick<Job, 'machines' | 'type'>) =>
  skyJobTitle(
    { type: job.type, jobMachines: job.machines.map((machine) => ({ machine })) },
    { withCustomer: false },
  ) || 'Job'

export const jobService = (job: Pick<Job, 'type'>) =>
  job.type ? JOB_TYPE_LABELS[job.type] : 'Industrial'

export const customerTypeLabel = (type: Customer['type']) =>
  type === 'school' ? 'School' : 'Industrial'

export function jobIssues(job: Job, today: string): string[] {
  const out: string[] = []
  const p = job.paperwork
  if (job.status !== 'complete' && job.endDate < today) out.push('Status not updated')
  if (job.status !== 'complete' && job.endDate >= today && job.startDate <= addDays(today, 3)) {
    const missing = [!p.quote && 'Quote', !p.rams && 'RAMS', !p.po && 'PO'].filter(Boolean)
    if (missing.length) out.push(`${missing.join(' & ')} needed`)
  }
  if (job.endDate < today) {
    const missing = [!p.report && 'Report', !p.invoice && 'Invoice'].filter(Boolean)
    if (missing.length) out.push(`${missing.join(' & ')} outstanding`)
  }
  return out
}

export function daysBookedInMonth(jobs: Job[], month: string): number {
  const days = new Set<string>()
  for (const job of jobs)
    for (let d = job.startDate; d <= job.endDate; d = addDays(d, 1))
      if (d.startsWith(month)) days.add(d)
  return days.size
}

function useToday() {
  const [today, setToday] = useState(() => toIsoDate(new Date()))
  useEffect(() => {
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = setTimeout(() => setToday(toIsoDate(new Date())), +midnight - +now + 1000)
    return () => clearTimeout(timer)
  }, [today])
  return today
}

export const boardJobsQuery = {
  queryKey: ['jobs', 'board'],
  queryFn: () => getJobAssignments('1900-01-01', '2999-12-31'),
}

export function useBoard() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const me = session?.user
  const canEdit = me?.role?.split(',').includes('admin') ?? false
  const preview = usePreview()
  const today = useToday()

  const allJobs = useQuery({ ...boardJobsQuery, enabled: !!me && canEdit })
  const myJobs = useQuery({ ...myJobsQuery, enabled: !!me && !canEdit })
  const customers = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => listUsers(),
    enabled: !!me && canEdit,
  })
  const jobsQuery = canEdit ? allJobs : myJobs

  return useMemo(() => {
    const team: TeamMember[] = (
      canEdit
        ? (users.data?.users ?? [])
        : me
          ? [{ ...me, banned: false }]
          : []
    )
      .map((u) => {
        const pay = preview.members[u.id] ?? {}
        const isAdmin = u.role?.split(',').includes('admin') ?? false
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          isAdmin,
          role: isAdmin ? 'Admin' : 'Staff',
          active: !u.banned && !pay.hidden,
          dayPayPence: pay.dayPayPence ?? preview.dayPayPence,
          travelDayPayPence: pay.travelDayPayPence ?? preview.travelDayPayPence,
          paidSeparately: pay.paidSeparately ?? false,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const raw = (jobsQuery.data ?? []) as RawJob[]
    const jobs: Job[] = raw.map((j) => {
      const crew: CrewMember[] = j.jobAssignments
        ? j.jobAssignments.map((a) => ({
            assignmentId: a.id,
            userId: a.userId,
            role: a.role === 'lead' ? 'lead' : 'member',
          }))
        : me
          ? [{ assignmentId: null, userId: me.id, role: 'member' }]
          : []
      const pay = preview.jobs[String(j.id)] ?? {}
      return {
        id: j.id,
        customerId: j.customerId,
        startDate: j.startDate,
        endDate: j.endDate,
        status: j.status,
        colour: j.colour,
        type: j.type,
        hotel: j.hotel ?? false,
        paperwork: {
          quote: j.quote ?? false,
          rams: j.rams ?? false,
          po: j.po ?? false,
          report: j.report ?? false,
          invoice: j.invoice ?? false,
        },
        machines: j.jobMachines.map((jm) => jm.machine),
        crew,
        crewIds: crew.map((c) => c.userId),
        leadId: crew.find((c) => c.role === 'lead')?.userId ?? null,
        payRate: pay.payRate ?? NORMAL_PAY_RATE,
        travelDays: pay.travelDays ?? 0,
        bonuses: pay.bonuses ?? {},
      }
    })

    const customerById = new Map((customers.data ?? []).map((c) => [c.id, c]))
    const memberById = new Map(team.map((m) => [m.id, m]))
    const payRates: PayRate[] = preview.payRates

    return {
      loading:
        sessionPending ||
        customers.isPending ||
        jobsQuery.isPending ||
        (canEdit && users.isPending),
      error: customers.error ?? jobsQuery.error ?? users.error,
      me,
      canEdit,
      today,
      preview,
      payRates,
      payRateName: (id: string) => payRates.find((r) => r.id === id)?.name ?? id,
      customers: customers.data ?? [],
      team,
      jobs,
      customer: (id: number) => customerById.get(id),
      customerName: (id: number) => customerById.get(id)?.name ?? 'Unknown customer',
      member: (id: string) => memberById.get(id),
      memberName: (id: string) => memberById.get(id)?.name ?? 'Unknown',
      issues: (job: Job) => jobIssues(job, today),
    }
  }, [
    canEdit,
    me,
    sessionPending,
    preview,
    today,
    users.data,
    users.isPending,
    users.error,
    jobsQuery.data,
    jobsQuery.isPending,
    jobsQuery.error,
    customers.data,
    customers.isPending,
    customers.error,
  ])
}

export type Board = ReturnType<typeof useBoard>
