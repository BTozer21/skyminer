import { createFileRoute } from '@tanstack/react-router';
import { AccountView } from '@neondatabase/auth-ui';

export const Route = createFileRoute('/_authenticated/account/$pathname')({
  component: Account,
})

function Account() {
  const { pathname } = Route.useParams();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'start',
        minHeight: '100vh',
        padding: '0 2rem',
      }}
    >
      <AccountView pathname={pathname} />
    </div>
  ) 
}
