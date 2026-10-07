import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { authClient } from '@/auth'

export const Route = createFileRoute('/_authenticated/account/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = Route.useRouteContext()

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mb-4 mt-2 flex shrink-0 items-center">
        <h1 className="font-bold text-xl">Account</h1>
      </div>
      <div className="flex w-full max-w-md flex-col gap-10">
        <ProfileForm name={user.name} email={user.email} />
        <PasswordForm />
      </div>
    </div>
  )
}

function ProfileForm({ name: initialName, email }: { name: string; email: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    const { error } = await authClient.updateUser({ name: name.trim() })
    setIsPending(false)
    if (error) {
      toast.error(error.message ?? 'Could not update your name')
      return
    }
    await router.invalidate()
    toast.success('Name updated')
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldSet>
        <FieldLegend>Profile</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" value={email} disabled />
          </Field>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
            />
          </Field>
          <Field orientation="horizontal">
            <Button type="submit" disabled={isPending || !name.trim() || name.trim() === initialName}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </Field>
        </FieldGroup>
      </FieldSet>
    </form>
  )
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })
    setIsPending(false)
    if (error) {
      toast.error(error.message ?? 'Could not change your password')
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    toast.success('Password changed')
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldSet>
        <FieldLegend>Password</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="current-password">Current password</FieldLabel>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isPending}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isPending}
              required
            />
          </Field>
          <Field orientation="horizontal">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Changing...' : 'Change password'}
            </Button>
          </Field>
        </FieldGroup>
      </FieldSet>
    </form>
  )
}
