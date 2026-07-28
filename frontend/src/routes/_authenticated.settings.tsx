import { createFileRoute } from '@tanstack/react-router';
import { ModeToggle } from '@/components/mode-toggle';

export const Route = createFileRoute('/_authenticated/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
  <div className="px-5">
      <h1>Settings</h1>
  </div>
  )
}
