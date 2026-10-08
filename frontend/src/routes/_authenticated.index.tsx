import { createFileRoute } from '@tanstack/react-router'

import { useBoard } from '@/ops/board'
import { MyWorkPage } from '@/ops/pages/EmployeeView'
import { TodayPage } from '@/ops/pages/TodayPage'

export const Route = createFileRoute('/_authenticated/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { canEdit } = useBoard()
  return canEdit ? <TodayPage /> : <MyWorkPage />
}
