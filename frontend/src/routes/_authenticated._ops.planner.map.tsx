import { createFileRoute } from '@tanstack/react-router'
import { MapView } from '@/ops/pages/MapView'

export const Route = createFileRoute('/_authenticated/_ops/planner/map')({
  component: MapView,
})
