import { differenceInCalendarDays } from 'date-fns'
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

export const JOB_COLOUR_CONFIG = {
  red: { label: 'Red', swatch: 'bg-red-500', className: 'bg-red-500/60 dark:bg-red-500/60' },
  orange: { label: 'Orange', swatch: 'bg-orange-500', className: 'bg-orange-500/60 dark:bg-orange-500/30' },
  amber: { label: 'Amber', swatch: 'bg-amber-400', className: 'bg-amber-400/60 dark:bg-amber-400/30' },
  lime: { label: 'Lime', swatch: 'bg-lime-500', className: 'bg-lime-500/60 dark:bg-lime-500/60' },
  green: { label: 'Green', swatch: 'bg-green-600', className: 'bg-green-600/20 dark:bg-green-600/30' },
  teal: { label: 'Teal', swatch: 'bg-teal-500', className: 'bg-teal-500/20 dark:bg-teal-500/30' },
  cyan: { label: 'Cyan', swatch: 'bg-cyan-400', className: 'bg-cyan-400/25 dark:bg-cyan-400/30' },
  blue: { label: 'Blue', swatch: 'bg-blue-600', className: 'bg-blue-600/20 dark:bg-blue-600/30' },
  indigo: { label: 'Indigo', swatch: 'bg-indigo-500', className: 'bg-indigo-500/20 dark:bg-indigo-500/30' },
  violet: { label: 'Violet', swatch: 'bg-violet-500', className: 'bg-violet-500/20 dark:bg-violet-500/30' },
  fuchsia: { label: 'Fuchsia', swatch: 'bg-fuchsia-500', className: 'bg-fuchsia-500/20 dark:bg-fuchsia-500/30' },
  pink: { label: 'Pink', swatch: 'bg-pink-400', className: 'bg-pink-400/25 dark:bg-pink-400/30' },
} satisfies Record<JobResponse['colour'], { label: string; swatch: string; className: string }>

export const JOB_COLOURS = Object.keys(JOB_COLOUR_CONFIG) as JobResponse['colour'][]

export function suggestJobColour(
  nearbyJobs: { colour: JobResponse['colour']; startDate: string; endDate: string }[],
  startDate: string,
  endDate: string,
): JobResponse['colour'] {
  const gapInDays = (job: { startDate: string; endDate: string }) =>
    Math.max(
      0,
      differenceInCalendarDays(new Date(job.startDate), new Date(endDate)),
      differenceInCalendarDays(new Date(startDate), new Date(job.endDate)),
    )

  const ranked = JOB_COLOURS.map((colour) => {
    const sameColour = nearbyJobs.filter((job) => job.colour === colour)
    return {
      colour,
      uses: sameColour.length,
      nearestGap: sameColour.length ? Math.min(...sameColour.map(gapInDays)) : 0,
    }
  }).sort((a, b) => a.uses - b.uses || b.nearestGap - a.nearestGap)

  return ranked[0].colour
}

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
