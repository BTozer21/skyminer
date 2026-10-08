import { createFileRoute } from '@tanstack/react-router'
import { PayrollPage } from '@/ops/pages/PayrollPage'

export const Route = createFileRoute('/_authenticated/_ops/payroll')({
  component: PayrollPage,
})
