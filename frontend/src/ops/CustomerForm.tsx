import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCustomer,
  createCustomerContact,
  createMachine,
  deleteCustomer,
  deleteCustomerContact,
  getCustomerContacts,
  getCustomerMachines,
} from '@/lib/api'
import type { CustomerResponse } from '@/lib/api'
import { machines as MACHINE_TYPES } from '@/lib/machines'
import { customerTypeLabel, jobTitle, useBoard } from './board'
import { longDate } from './dates'
import { useDrawers } from './drawers'
import { Icon } from './icons'
import { ConfirmDelete, Drawer, Segmented, StatusPill, useToast } from './ui'

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.')

export function CustomerForm({ customerId }: { customerId: number | null }) {
  const board = useBoard()
  const customer = customerId ? board.customer(customerId) : undefined
  const drawers = useDrawers()

  if (customerId && !customer) {
    return (
      <Drawer eyebrow="Customer" title="Customer not found" onClose={drawers.close} footer={null}>
        <p className="muted">It may have been deleted by someone else.</p>
      </Drawer>
    )
  }
  return customer ? <ExistingCustomer customer={customer} /> : <NewCustomer />
}

function NewCustomer() {
  const drawers = useDrawers()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState({ name: '', type: 'industrial' as CustomerResponse['type'], postcode: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!draft.name.trim()) return setError('Add a name.')
    if (!draft.postcode.trim()) return setError('Add a postcode.')
    setSaving(true)
    try {
      await createCustomer({ name: draft.name.trim(), type: draft.type, postcode: draft.postcode })
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      drawers.close()
      toast('Customer added')
    } catch (e) {
      setError(message(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      eyebrow="New customer"
      title="Add a customer"
      onClose={drawers.close}
      onSubmit={submit}
      footer={
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={drawers.close}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            Add customer
          </button>
        </>
      }
    >
      <div className="sec">
        <div className="sec-t">Details</div>
        <div className="field">
          <label htmlFor="c-name">Name</label>
          <input
            id="c-name"
            className="input"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="two">
          <div className="field">
            <span className="lbl">Type</span>
            <Segmented
              label="Customer type"
              value={draft.type}
              onChange={(type) => setDraft({ ...draft, type })}
              options={[
                { value: 'industrial', label: 'Industrial' },
                { value: 'school', label: 'School' },
              ]}
            />
          </div>
          <div className="field">
            <label htmlFor="c-postcode">Postcode</label>
            <input
              id="c-postcode"
              className="input"
              placeholder="e.g. NG11 8AA"
              value={draft.postcode}
              onChange={(e) => setDraft({ ...draft, postcode: e.target.value })}
            />
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12.5 }}>
          Add contacts and machines once the customer is saved.
        </div>
      </div>
      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
    </Drawer>
  )
}

function ExistingCustomer({ customer }: { customer: CustomerResponse }) {
  const board = useBoard()
  const drawers = useDrawers()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [contact, setContact] = useState({ name: '', phoneNo: '', email: '' })
  const [machine, setMachine] = useState({ type: '', location: '' })

  const contacts = useQuery({
    queryKey: ['customers', customer.id, 'contacts'],
    queryFn: () => getCustomerContacts(customer.id),
  })
  const machines = useQuery({
    queryKey: ['customers', customer.id, 'machines'],
    queryFn: () => getCustomerMachines(customer.id),
    enabled: customer.type === 'industrial',
  })
  const history = board.jobs
    .filter((j) => j.customerId === customer.id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['customers'] })

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action()
      await refresh()
      setError('')
      toast(done)
      return true
    } catch (e) {
      setError(message(e))
      return false
    }
  }

  const addContact = async () => {
    if (!contact.name.trim() || !contact.phoneNo.trim()) return setError('A contact needs a name and phone number.')
    const ok = await run(
      () =>
        createCustomerContact(customer.id, {
          name: contact.name,
          phoneNo: contact.phoneNo,
          email: contact.email.trim() || null,
        }),
      `Added ${contact.name.trim()}`,
    )
    if (ok) setContact({ name: '', phoneNo: '', email: '' })
  }

  const addMachine = async () => {
    if (!machine.type) return setError('Pick a machine type.')
    const ok = await run(
      () =>
        createMachine({
          customerId: customer.id,
          type: machine.type,
          location: machine.location.trim() || null,
        }),
      `Added ${machine.type}`,
    )
    if (ok) setMachine({ type: '', location: '' })
  }

  return (
    <Drawer
      eyebrow={customerTypeLabel(customer.type)}
      title={customer.name}
      onClose={drawers.close}
      footer={
        <>
          <ConfirmDelete
            label="Delete"
            onConfirm={async () => {
              const ok = await run(() => deleteCustomer(customer.id), 'Customer deleted')
              if (ok) drawers.close()
            }}
          />
          <span className="spacer" />
          <Link className="btn" to="/admin/customers/$customerId" params={{ customerId: String(customer.id) }}>
            Full page
          </Link>
          <button type="button" className="btn" onClick={drawers.close}>
            Close
          </button>
        </>
      }
    >
      <div className="sec">
        <div className="sec-t">Details</div>
        <div className="two">
          <div className="field">
            <span className="lbl">Type</span>
            <div className="input readonly">{customerTypeLabel(customer.type)}</div>
          </div>
          <div className="field">
            <span className="lbl">Postcode</span>
            <div className="input readonly">{customer.postcode || '—'}</div>
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-t">Contacts · {contacts.data?.length ?? 0}</div>
        <div className="mach-list">
          {(contacts.data ?? []).map((c) => (
            <div key={c.id} className="m">
              <span>
                {c.name} · {c.phoneNo}
                {c.email && <span className="muted"> · {c.email}</span>}
              </span>
              <button
                type="button"
                className="btn icon ghost"
                aria-label={`Remove ${c.name}`}
                onClick={() => run(() => deleteCustomerContact(c.id), `Removed ${c.name}`)}
              >
                {Icon.close}
              </button>
            </div>
          ))}
        </div>
        <div className="inline-add contact-add">
          <input
            className="input"
            placeholder="Name"
            aria-label="Contact name"
            value={contact.name}
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Phone"
            aria-label="Contact phone"
            value={contact.phoneNo}
            onChange={(e) => setContact({ ...contact, phoneNo: e.target.value })}
          />
          <input
            className="input"
            placeholder="Email (optional)"
            aria-label="Contact email"
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
          />
          <button type="button" className="btn" onClick={addContact}>
            Add
          </button>
        </div>
      </div>

      {customer.type === 'industrial' && (
        <div className="sec">
          <div className="sec-t">Machines · {machines.data?.length ?? 0}</div>
          <div className="mach-list">
            {(machines.data ?? []).map((m) => (
              <div key={m.id} className="m">
                <span>{m.location ? `${m.type} (${m.location})` : m.type}</span>
              </div>
            ))}
          </div>
          <div className="inline-add">
            <select
              className="select"
              aria-label="Machine type"
              value={machine.type}
              onChange={(e) => setMachine({ ...machine, type: e.target.value })}
            >
              <option value="">Machine type…</option>
              {MACHINE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Location, e.g. Line 3"
              aria-label="Machine location"
              value={machine.location}
              onChange={(e) => setMachine({ ...machine, location: e.target.value })}
            />
            <button type="button" className="btn" onClick={addMachine}>
              Add
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="sec">
          <div className="sec-t">Job history · {history.length}</div>
          <div className="hist">
            {history.slice(0, 40).map((j) => (
              <button key={j.id} type="button" onClick={() => drawers.openJob(j.id)}>
                <span className="mono muted">{longDate(j.startDate)}</span>
                <span className="d">{jobTitle(j)}</span>
                <StatusPill status={j.status} />
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
    </Drawer>
  )
}
