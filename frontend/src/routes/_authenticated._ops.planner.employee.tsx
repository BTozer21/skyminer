import { createFileRoute } from '@tanstack/react-router'
import { EmployeeView } from '@/ops/pages/EmployeeView'

export const Route = createFileRoute('/_authenticated/_ops/planner/employee')({
  component: EmployeeView,
})
