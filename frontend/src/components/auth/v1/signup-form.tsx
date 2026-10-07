import { useState } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/auth'

export function SignupForm() {
  const navigate = useNavigate()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsPending(true)

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
    })

    if (signUpError) {
      setIsPending(false)
      setError(signUpError.message ?? 'Unable to sign up. Please try again.')
      return
    }

    setIsPending(false)
    await router.invalidate()
    await navigate({ to: '/' })
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card p-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Create your account</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              required
            />
          </Field>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              required
            />
            <FieldDescription>Must be at least 8 characters long.</FieldDescription>
            <FieldError>{error}</FieldError>
          </Field>
          <Field>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating account...' : 'Create account'}
            </Button>
            <FieldDescription className="text-center">
              Already have an account? <Link to="/login">Sign in</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
