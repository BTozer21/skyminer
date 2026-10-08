import { createFileRoute } from '@tanstack/react-router'
import { TeamGrid } from '@/ops/pages/TeamGrid'

export const Route = createFileRoute('/_authenticated/_ops/planner/')({
  component: TeamGrid,
})
