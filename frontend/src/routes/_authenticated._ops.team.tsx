import { createFileRoute } from '@tanstack/react-router'
import { TeamPage } from '@/ops/pages/TeamPage'

export const Route = createFileRoute('/_authenticated/_ops/team')({
  component: TeamPage,
})
