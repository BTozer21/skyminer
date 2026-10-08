import type { ReactElement } from 'react'

import { Icon } from './icons'

type Page = {
  to: string
  label: string
  icon: ReactElement
  inTabBar: boolean
}

const ADMIN_PAGES: Page[] = [
  { to: '/', label: 'Today', icon: Icon.today, inTabBar: true },
  { to: '/planner', label: 'Planner', icon: Icon.planner, inTabBar: true },
  { to: '/jobs', label: 'Jobs', icon: Icon.jobs, inTabBar: true },
  { to: '/customers', label: 'Customers', icon: Icon.customers, inTabBar: true },
  { to: '/team', label: 'Team', icon: Icon.team, inTabBar: true },
  { to: '/payroll', label: 'Payroll', icon: Icon.pound, inTabBar: true },
  { to: '/admin/leave-requests', label: 'Leave', icon: Icon.leave, inTabBar: false },
  { to: '/settings', label: 'Settings', icon: Icon.settings, inTabBar: false },
]

const STAFF_PAGES: Page[] = [
  { to: '/', label: 'My work', icon: Icon.today, inTabBar: true },
  { to: '/leave-requests', label: 'Leave', icon: Icon.leave, inTabBar: true },
]

export const pagesFor = (isAdmin: boolean) => (isAdmin ? ADMIN_PAGES : STAFF_PAGES)
