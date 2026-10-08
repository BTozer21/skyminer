import { createFileRoute } from '@tanstack/react-router'
import { JobsPage } from '@/ops/pages/JobsPage'

export const Route = createFileRoute('/_authenticated/_ops/jobs/')({
  component: JobsPage,
})
