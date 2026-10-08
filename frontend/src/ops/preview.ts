import { useSyncExternalStore } from 'react'

export type PayRate = {
  id: string
  name: string
  kind: 'multiplier' | 'fixed'
  value: number
  archived: boolean
}

export type MemberPay = {
  dayPayPence?: number
  travelDayPayPence?: number
  paidSeparately?: boolean
  hidden?: boolean
}

export type JobPay = {
  payRate?: string
  travelDays?: number
  bonuses?: Record<string, number>
}

export type Preview = {
  dayPayPence: number
  travelDayPayPence: number
  payRates: PayRate[]
  members: Record<string, MemberPay>
  jobs: Record<string, JobPay>
  plannerZoom: number
}

export const NORMAL_PAY_RATE = 'normal'

const DEFAULTS: Preview = {
  dayPayPence: 15000,
  travelDayPayPence: 6000,
  payRates: [
    { id: NORMAL_PAY_RATE, name: 'Normal', kind: 'multiplier', value: 100, archived: false },
    { id: 'time_and_half', name: '×1.5', kind: 'multiplier', value: 150, archived: false },
    { id: 'double', name: '×2', kind: 'multiplier', value: 200, archived: false },
    { id: 'school', name: 'School', kind: 'fixed', value: 10000, archived: false },
  ],
  members: {},
  jobs: {},
  plannerZoom: 100,
}

const KEY = 'sky.preview'
const listeners = new Set<() => void>()

function read(): Preview {
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

let current = read()

export function updatePreview(change: (p: Preview) => Preview) {
  current = change(current)
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Kept for this visit only.
  }
  listeners.forEach((l) => l())
}

export function usePreview() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}
