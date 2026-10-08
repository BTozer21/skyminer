import { useNavigate, useSearch } from '@tanstack/react-router'

const DRAWER_PARAMS = ['job', 'customer', 'member', 'date', 'crew'] as const
type DrawerParam = (typeof DRAWER_PARAMS)[number]

export type SearchParams = Record<string, string | undefined>

export function useSearchParams() {
  const raw = useSearch({ strict: false })
  const search: SearchParams = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, v == null ? undefined : String(v)]),
  )
  const navigate = useNavigate()
  const setParams = (change: (prev: SearchParams) => SearchParams) =>
    navigate({
      to: '.',
      search: () =>
        Object.fromEntries(
          Object.entries(change(search))
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, /^\d+$/.test(v!) ? Number(v) : v]),
        ) as never,
    })
  return [search, setParams] as const
}

export function useDrawers() {
  const [params, setParams] = useSearchParams()

  const open = (next: Partial<Record<DrawerParam, string>>) =>
    setParams((prev) => {
      const p: SearchParams = { ...prev }
      DRAWER_PARAMS.forEach((k) => delete p[k])
      Object.entries(next).forEach(([k, v]) => {
        if (v) p[k] = v
      })
      return p
    })

  return {
    params,
    openJob: (id: number) => open({ job: String(id) }),
    newJob: (preset: { date?: string; crewId?: string } = {}) =>
      open({ job: 'new', date: preset.date, crew: preset.crewId }),
    openCustomer: (id: number | 'new') => open({ customer: String(id) }),
    openMember: (id: string) => open({ member: id }),
    close: () => open({}),
  }
}
