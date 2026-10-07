import { Check } from 'lucide-react'

import { JOB_COLOURS, JOB_COLOUR_CONFIG } from '@/lib/v1/jobs'
import { cn } from '@/lib/utils'

import type { JobResponse } from '@/lib/api'

export function JobColourSwatches({
  value,
  taken,
  onChange,
}: {
  value?: JobResponse['colour']
  taken: Set<JobResponse['colour']>
  onChange: (colour: JobResponse['colour']) => void
}) {
  return (
    <div className="grid w-fit grid-cols-6 gap-2">
      {JOB_COLOURS.map((colour) => {
        const { label, swatch } = JOB_COLOUR_CONFIG[colour]
        const isTaken = taken.has(colour)

        return (
          <button
            key={colour}
            type="button"
            onClick={() => onChange(colour)}
            title={isTaken ? `${label} (used nearby)` : label}
            aria-label={label}
            aria-pressed={value === colour}
            className={cn(
              'flex size-7 items-center justify-center rounded-full transition-opacity',
              swatch,
              isTaken && value !== colour && 'opacity-30 hover:opacity-60',
              value === colour && 'ring-foreground ring-2 ring-offset-2 ring-offset-background',
            )}
          >
            {value === colour ? <Check className="size-4 text-white" /> : null}
          </button>
        )
      })}
    </div>
  )
}
