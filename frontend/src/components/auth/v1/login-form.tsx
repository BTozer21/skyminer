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

export function LoginForm() {
  const navigate = useNavigate()
  const router = useRouter()
  const [oauthQuery] = useState(() => window.location.search.replace(/^\?/, ''))
  const oauthParams = new URLSearchParams(oauthQuery)
  const isAuthorizing = oauthParams.has('client_id') && oauthParams.has('sig')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsPending(true)

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    })

    if (signInError) {
      setIsPending(false)
      setError(signInError.message ?? 'Unable to sign in. Please try again.')
      return
    }

    if (isAuthorizing) {
      window.location.href = new URL(
        `/api/auth/oauth2/authorize?${oauthQuery}`,
        import.meta.env.VITE_API_URL,
      ).toString()
      return
    }

    setIsPending(false)
    await router.invalidate()
    await navigate({ to: '/' })
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card p-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Login with your email and password
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
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
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              required
            />
            <FieldError>{error}</FieldError>
          </Field>
          <Field>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Logging in...' : 'Login'}
            </Button>
            <FieldDescription className="text-center">
              Don&apos;t have an account? <Link to="/signup">Sign up</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
