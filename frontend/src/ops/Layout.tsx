import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'

import { authClient } from '@/auth'
import { useTheme } from '@/components/theme-provider'
import { useBoard } from './board'
import { CommandPalette } from './CommandPalette'
import { DrawerHost } from './DrawerHost'
import { useDrawers } from './drawers'
import { Icon } from './icons'
import { pagesFor } from './nav'
import { ToastProvider } from './ui'

export function Layout() {
  const board = useBoard()
  const drawers = useDrawers()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { theme: chosen, setTheme } = useTheme()
  const theme =
    chosen === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : chosen
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const attention = board.jobs.filter((j) => board.issues(j).length).length
  const [paletteOpen, setPaletteOpen] = useState(false)
  const staff = !board.canEdit
  const pages = pagesFor(board.canEdit)

  const signOut = async () => {
    await authClient.signOut()
    queryClient.clear()
    navigate({ to: '/login' })
  }

  useEffect(() => {
    if (staff) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      } else if (
        e.key === '/' &&
        !(e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) &&
        !document.querySelector('.drawer')
      ) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [staff])

  const searchButton = (shortcut: boolean) => (
    <button type="button" className="search-btn" onClick={() => setPaletteOpen(true)}>
      {Icon.search}
      {shortcut ? 'Search or jump to…' : 'Search jobs & customers'}
      {shortcut && <kbd>⌘K</kbd>}
    </button>
  )

  return (
    <ToastProvider>
      <div className={`app ${staff ? 'staff' : ''}`}>
        <aside className="side" aria-label="Main">
          <div className="brand">
            <div className="brand-mark">{Icon.logo}</div>
            <div>
              <b>Skyminers</b>
              <span>Operations</span>
            </div>
          </div>
          {!staff && searchButton(true)}
          <nav className="nav">
            <div className="nav-label">Workspace</div>
            {pages.map((p) => (
              <Link key={p.to} to={p.to} activeOptions={{ exact: p.to === '/' }}>
                {p.icon}
                <span>{p.label}</span>
                {p.to === '/jobs' && attention > 0 && (
                  <span className="badge num" title="Jobs needing attention">
                    {attention}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="side-foot">
            <Link to="/account/settings" className="side-user" title={board.me?.email}>
              {board.me?.name} · {board.canEdit ? 'Admin' : 'Staff'}
            </Link>
            <button type="button" className="theme-btn" onClick={toggle}>
              {theme === 'dark' ? Icon.sun : Icon.moon}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button type="button" className="theme-btn" onClick={signOut}>
              {Icon.logout}
              Sign out
            </button>
          </div>
        </aside>

        <div className="main">
          <div className="page">
            <div className="mobile-top">
              <div className="brand-mark">{Icon.logo}</div>
              {staff ? (
                <>
                  <b className="mobile-name">{board.me?.name}</b>
                  <button
                    type="button"
                    className="btn icon"
                    aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    onClick={toggle}
                  >
                    {theme === 'dark' ? Icon.sun : Icon.moon}
                  </button>
                  <button type="button" className="btn icon" aria-label="Sign out" onClick={signOut}>
                    {Icon.logout}
                  </button>
                </>
              ) : (
                searchButton(false)
              )}
              {board.canEdit && (
                <button
                  type="button"
                  className="btn icon accent"
                  aria-label="Add job"
                  onClick={() => drawers.newJob()}
                >
                  {Icon.plus}
                </button>
              )}
              {board.canEdit && (
                <Link className="btn icon" to="/settings" aria-label="Settings">
                  {Icon.settings}
                </Link>
              )}
            </div>
            {board.error ? (
              <div className="card empty">
                <b>Couldn't load the board</b>
                {board.error.message}
              </div>
            ) : board.loading ? (
              <div className="skel" style={{ height: 360 }} />
            ) : (
              <Outlet />
            )}
          </div>
        </div>

        <nav className="tabbar" aria-label="Main">
          {pages
            .filter((p) => p.inTabBar)
            .map((p) => (
              <Link key={p.to} to={p.to} activeOptions={{ exact: p.to === '/' }}>
                {p.icon}
                <span>{p.label}</span>
                {p.to === '/jobs' && attention > 0 && <i className="dot" />}
              </Link>
            ))}
        </nav>

        {!board.loading && board.canEdit && <DrawerHost />}
        {!board.loading && !staff && paletteOpen && (
          <CommandPalette onClose={() => setPaletteOpen(false)} />
        )}
      </div>
    </ToastProvider>
  )
}
