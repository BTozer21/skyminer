import { CheckCircle2, Circle, CircleDashed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { JobResponse } from '@/lib/api'

// One source of truth for status colour, icon, and the set of statuses.
// `satisfies` makes TS flag it if the enum gains a value this map misses.
// `bar` is the filled variant used for calendar bands, where the status has to
// read from a block of colour rather than a small icon.
export const STATUS_CONFIG = {
  planning: { icon: CircleDashed, className: 'text-amber-500', hover: 'hover:bg-amber-200/30', focus: 'focus:bg-amber-200/30', bar: 'bg-amber-500/20 text-amber-900 dark:text-amber-100' },
  planned: { icon: Circle, className: 'text-blue-500', hover: 'hover:bg-blue-200/30', focus: 'focus:bg-blue-200/30', bar: 'bg-blue-500/20 text-blue-900 dark:text-blue-100' },
  complete: { icon: CheckCircle2, className: 'text-green-500', hover: 'hover:bg-green-200/30', focus: 'focus:bg-green-200/30', bar: 'bg-green-500/20 text-green-900 dark:text-green-100' },
} satisfies Record<JobResponse['status'], { icon: LucideIcon; className: string; hover: string; focus: string; bar: string }>

export const STATUSES = Object.keys(STATUS_CONFIG) as JobResponse['status'][]

export function jobTitle(
  job: {
    customer?: { name: string } | null
    jobMachines?: { machine: { type: string; location?: string | null } }[]
  },
  { withCustomer = true }: { withCustomer?: boolean } = {},
): string {
  const machines = job.jobMachines
    ?.map(({ machine }) =>
      machine.location ? `${machine.type} (${machine.location})` : machine.type,
    )
    .join(', ')

  if (!withCustomer) return machines ?? ''

  const customer = job.customer?.name ?? 'Unknown customer'
  return machines ? `${customer} — ${machines}` : customer
}
