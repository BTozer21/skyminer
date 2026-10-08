import { CustomerForm } from './CustomerForm'
import { useDrawers } from './drawers'
import { JobForm } from './JobForm'
import { MemberForm } from './MemberForm'

export function DrawerHost() {
  const { params } = useDrawers()
  const job = params.job
  const customer = params.customer
  const member = params.member

  if (job)
    return (
      <JobForm
        key={job + (params.date ?? '')}
        jobId={job === 'new' ? null : Number(job)}
        preset={{ date: params.date ?? null, crewId: params.crew ?? null }}
      />
    )
  if (customer)
    return <CustomerForm key={customer} customerId={customer === 'new' ? null : Number(customer)} />
  if (member) return <MemberForm key={member} memberId={member} />
  return null
}
