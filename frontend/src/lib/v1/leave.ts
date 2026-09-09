import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { LeaveRequestResponse } from '@/lib/api'

// One source of truth for leave status colour, icon, and label — the mirror of
// STATUS_CONFIG for jobs. `bar` is the filled variant used for calendar bands.
export const LEAVE_STATUS_CONFIG = {
  submitted: { icon: CircleDashed, label: 'Submitted', className: 'text-amber-500', bar: 'border border-dashed !border-violet-500/60 bg-violet-500/10 text-violet-900 dark:text-violet-100' },
  approved: { icon: CheckCircle2, label: 'Approved', className: 'text-green-500', bar: 'bg-violet-500/25 text-violet-900 dark:text-violet-100' },
  denied: { icon: XCircle, label: 'Denied', className: 'text-red-500', bar: 'bg-muted text-muted-foreground line-through' },
} satisfies Record<LeaveRequestResponse['status'], { icon: LucideIcon; label: string; className: string; bar: string }>
