import { CheckCircle2, Circle, CircleDashed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { JobResponse } from '@/lib/api'

// One source of truth for status colour, icon, and the set of statuses.
// `satisfies` makes TS flag it if the enum gains a value this map misses.
export const STATUS_CONFIG = {
  planning: { icon: CircleDashed, className: 'text-amber-500', hover: 'hover:bg-amber-200/30', focus: 'focus:bg-amber-200/30' },
  planned: { icon: Circle, className: 'text-blue-500', hover: 'hover:bg-blue-200/30', focus: 'focus:bg-blue-200/30' },
  complete: { icon: CheckCircle2, className: 'text-green-500', hover: 'hover:bg-green-200/30', focus: 'focus:bg-green-200/30' },
} satisfies Record<JobResponse['status'], { icon: LucideIcon; className: string; hover: string; focus: string }>

export const STATUSES = Object.keys(STATUS_CONFIG) as JobResponse['status'][]
