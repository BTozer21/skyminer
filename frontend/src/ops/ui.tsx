import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { JOB_STATUS_LABELS, STATUS_CLASS } from './board'
import type { JobStatus } from './board'
import { Icon } from './icons'

export function hue(name: string): number {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

function initials(name: string): string {
  const words = name
    .replace(/[–—(].*$/, '')
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
  return (
    words
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  )
}

export function Avatar({ name, size }: { name: string; size?: 'lg' | 'sq' }) {
  return (
    <span className={`av ${size ?? ''}`} style={{ ['--h' as string]: hue(name) }} aria-hidden>
      {initials(name)}
    </span>
  )
}

export function StatusPill({ status }: { status: JobStatus }) {
  return <span className={`status ${STATUS_CLASS[status]}`}>{JOB_STATUS_LABELS[status]}</span>
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card empty">
      <b>{title}</b>
      {children}
    </div>
  )
}

export function PageHead({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: ReactNode
  title: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </div>
  )
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function CrewAvatars({ names }: { names: string[] }) {
  if (!names.length)
    return (
      <span className="faint-dash" title="No crew assigned">
        —
      </span>
    )
  return (
    <span className="avs" title={names.join(', ')}>
      {names.slice(0, 4).map((n, i) => (
        <Avatar key={i} name={n} />
      ))}
    </span>
  )
}

export function PreviewNote({ children }: { children: ReactNode }) {
  return <div className="notice preview-note">{children}</div>
}

export function Drawer({
  eyebrow,
  title,
  onClose,
  children,
  footer,
  onSubmit,
}: {
  eyebrow: ReactNode
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  onSubmit?: () => void
}) {
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    body.current
      ?.querySelector<HTMLElement>('input:not([type=checkbox]):not(:disabled), select:not(:disabled)')
      ?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <form
          style={{ display: 'contents' }}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit?.()
          }}
        >
          <header className="dr-head">
            <div>
              <div className="eyebrow">{eyebrow}</div>
              <h2>{title}</h2>
            </div>
            <button type="button" className="btn icon ghost x" onClick={onClose} aria-label="Close">
              {Icon.close}
            </button>
          </header>
          <div className="dr-body" ref={body}>
            {children}
          </div>
          <footer className="dr-foot">{footer}</footer>
        </form>
      </aside>
    </>
  )
}

export function ConfirmDelete({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  return (
    <button
      type="button"
      className="btn danger ghost"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? 'Click again to delete' : label}
    </button>
  )
}

const ToastContext = createContext<(message: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback((msg: string) => {
    setMessage(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2600)
  }, [])

  return (
    <ToastContext value={show}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </ToastContext>
  )
}

export const useToast = () => useContext(ToastContext)
