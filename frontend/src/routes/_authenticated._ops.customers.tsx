import { createFileRoute } from '@tanstack/react-router'
import { CustomersPage } from '@/ops/pages/CustomersPage'

export const Route = createFileRoute('/_authenticated/_ops/customers')({
  component: CustomersPage,
})
