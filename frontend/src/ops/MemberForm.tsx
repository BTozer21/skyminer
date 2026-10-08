import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { useBoard } from './board'
import { useDrawers } from './drawers'
import { updatePreview } from './preview'
import type { MemberPay } from './preview'
import { Drawer, useToast } from './ui'

const PAY_FIELDS = [
  ['dayPayPence', 'Day pay (£)'],
  ['travelDayPayPence', 'Travel day pay (£)'],
] as const

export function MemberForm({ memberId }: { memberId: string }) {
  const board = useBoard()
  const drawers = useDrawers()
  const toast = useToast()
  const member = board.member(memberId)
  const saved = board.preview.members[memberId] ?? {}
  const [draft, setDraft] = useState<MemberPay>(saved)

  if (!member) {
    return (
      <Drawer eyebrow="Team" title="Person not found" onClose={drawers.close} footer={null}>
        <p className="muted">They may have been removed by someone else.</p>
      </Drawer>
    )
  }

  const set = (patch: Partial<MemberPay>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = () => {
    updatePreview((p) => ({ ...p, members: { ...p.members, [memberId]: draft } }))
    drawers.close()
    toast('Saved in this browser')
  }

  return (
    <Drawer
      eyebrow={member.role}
      title={member.name}
      onClose={drawers.close}
      onSubmit={submit}
      footer={
        <>
          <span className="spacer" />
          <Link className="btn" to="/admin/team/$userId" params={{ userId: member.id }}>
            Full page
          </Link>
          <button type="button" className="btn" onClick={drawers.close}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Save changes
          </button>
        </>
      }
    >
      <div className="sec">
        <div className="sec-t">Details</div>
        <div className="two">
          <div className="field">
            <span className="lbl">Name</span>
            <div className="input readonly">{member.name}</div>
          </div>
          <div className="field">
            <span className="lbl">Login role</span>
            <div className="input readonly">{member.role}</div>
          </div>
        </div>
        <div className="field">
          <span className="lbl">Email</span>
          <div className="input readonly">{member.email}</div>
        </div>
        <div className="muted" style={{ fontSize: 12.5 }}>
          Name, email and role come from the person's login. Change the role under Settings › Logins.
        </div>
      </div>

      <div className="sec">
        <div className="sec-t">
          Planner and pay <span className="preview-tag">Preview</span>
        </div>
        <div className="togs">
          <label className="tog">
            <input type="checkbox" checked={!draft.hidden} onChange={(e) => set({ hidden: !e.target.checked })} />
            <span className="box" />
            Show on the planner
          </label>
        </div>
        <div className="togs">
          <label className="tog">
            <input
              type="checkbox"
              checked={draft.paidSeparately ?? false}
              onChange={(e) => set({ paidSeparately: e.target.checked })}
            />
            <span className="box" />
            Paid separately (left off Payroll)
          </label>
        </div>
        {!draft.paidSeparately && (
          <div className="two">
            {PAY_FIELDS.map(([key, label]) => (
              <div key={key} className="field">
                <label htmlFor={`m-${key}`}>{label}</label>
                <input
                  id={`m-${key}`}
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder={`Company rate (£${(board.preview[key] / 100).toFixed(2)})`}
                  defaultValue={draft[key] === undefined ? '' : draft[key] / 100}
                  onChange={(e) =>
                    set({
                      [key]: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
        <div className="muted" style={{ fontSize: 12.5 }}>
          These are kept in this browser only. Skyminer's database has no pay or planner settings for
          people yet.
        </div>
      </div>
    </Drawer>
  )
}
