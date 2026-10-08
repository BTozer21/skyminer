import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from '@/ops/pages/SettingsPage'

export const Route = createFileRoute('/_authenticated/_ops/settings')({
  component: SettingsPage,
})
