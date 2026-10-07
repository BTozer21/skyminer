import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/auth'

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: 'Confirm who you are',
  profile: 'View your name and profile details',
  email: 'View your email address',
  offline_access: 'Stay connected when you are not using the app',
}

type PublicClient = {
  client_id: string
  client_name?: string
  logo_uri?: string
}

type ConsentResponse = {
  url?: string
  redirect_uri?: string
}

export function ConsentForm() {
  const [oauthQuery] = useState(() => window.location.search.replace(/^\?/, ''))
  const params = new URLSearchParams(oauthQuery)
  const clientId = params.get('client_id')
  const scopes = (params.get('scope') ?? '').split(' ').filter(Boolean)

  const [client, setClient] = useState<PublicClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'accept' | 'deny' | null>(null)

  useEffect(() => {
    if (!clientId) {
      setError(
        'This authorization request is missing a client. Start again from the application you were signing in to.',
      )
      setIsLoading(false)
      return
    }

    const controller = new AbortController()

    void (async () => {
      const { data, error: clientError } = await authClient.$fetch<PublicClient>(
        `/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`,
        { signal: controller.signal },
      )

      if (controller.signal.aborted) return

      if (clientError) {
        setError('We could not look up the application requesting access.')
      } else {
        setClient(data)
      }
      setIsLoading(false)
    })()

    return () => {
      controller.abort()
    }
  }, [clientId])

  async function decide(accept: boolean) {
    setError(null)
    setPending(accept ? 'accept' : 'deny')

    const { data, error: consentError } =
      await authClient.$fetch<ConsentResponse>('/oauth2/consent', {
        method: 'POST',
        body: { accept, oauth_query: oauthQuery },
      })

    const redirectTo = data?.url ?? data?.redirect_uri

    if (consentError || !redirectTo) {
      setPending(null)
      setError('We could not complete the authorization. Please try again.')
      return
    }

    window.location.href = redirectTo
  }

  const appName = client?.client_name ?? 'An application'

  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card p-6">
      <div className="text-center">
        {client?.logo_uri ? (
          <img
            src={client.logo_uri}
            alt=""
            className="mx-auto mb-2 size-10 rounded-md object-contain"
          />
        ) : null}
        <h1 className="text-xl font-semibold">
          {isLoading ? <Skeleton className="mx-auto h-6 w-48" /> : `${appName} wants access`}
        </h1>
        {isLoading ? null : (
          <p className="text-sm text-muted-foreground">
            Allowing this will let {appName} act on your behalf with the
            permissions below.
          </p>
        )}
      </div>

      {scopes.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm">
          {scopes.map((scope) => (
            <li key={scope}>{SCOPE_DESCRIPTIONS[scope] ?? scope}</li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={() => decide(true)}
          disabled={pending !== null || isLoading || !clientId}
        >
          {pending === 'accept' ? 'Allowing...' : 'Allow access'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => decide(false)}
          disabled={pending !== null || isLoading || !clientId}
        >
          {pending === 'deny' ? 'Cancelling...' : 'Cancel'}
        </Button>
      </div>
    </div>
  )
}
