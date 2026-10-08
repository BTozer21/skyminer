const pad = (n: number) => String(n).padStart(2, '0')

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = parseIsoDate(iso)
  d.setDate(d.getDate() + n)
  return toIsoDate(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseIsoDate(b).getTime() - parseIsoDate(a).getTime()) / 86_400_000)
}

export function mondayOf(iso: string): string {
  const d = parseIsoDate(iso)
  return addDays(iso, -((d.getDay() + 6) % 7))
}

export function isoWeek(iso: string): number {
  const d = parseIsoDate(iso)
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1)
  return Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7)
}

export function overlaps(start: string, end: string, from: string, to: string): boolean {
  return start <= to && end >= from
}

export function quarterStart(iso: string): string {
  const d = parseIsoDate(iso)
  return toIsoDate(new Date(d.getFullYear(), d.getMonth() - (d.getMonth() % 3), 1))
}

export function addMonths(iso: string, n: number): string {
  const d = parseIsoDate(iso)
  return toIsoDate(new Date(d.getFullYear(), d.getMonth() + n, d.getDate()))
}

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  parseIsoDate(iso).toLocaleDateString('en-GB', opts)

export const shortDate = (iso: string) => fmt(iso, { day: 'numeric', month: 'short' })
export const longDate = (iso: string) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' })
export const weekday = (iso: string) => fmt(iso, { weekday: 'short' })
export const monthYear = (iso: string) => fmt(iso, { month: 'long', year: 'numeric' })

export function dateRange(job: { startDate: string; endDate: string }): string {
  const { startDate: s, endDate: e } = job
  if (s === e) return shortDate(s)
  if (s.slice(0, 7) === e.slice(0, 7)) return `${parseIsoDate(s).getDate()}–${shortDate(e)}`
  return `${shortDate(s)} – ${shortDate(e)}`
}

export function relativeDay(iso: string): string {
  const d = daysBetween(toIsoDate(new Date()), iso)
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d === -1) return 'Yesterday'
  if (d > 1 && d < 7) return fmt(iso, { weekday: 'long' })
  return shortDate(iso)
}

const pounds = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
export const money = (pence: number) => pounds.format(pence / 100)
