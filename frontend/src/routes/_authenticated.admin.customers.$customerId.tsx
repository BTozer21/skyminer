import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteCustomerContact, getCustomer, getCustomerContacts } from '@/lib/api';

import { CreateMachineForm } from '@/components/forms/v1/create-machine-form';
import { CreateContactForm } from '@/components/forms/v1/create-contact-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute(
  '/_authenticated/admin/customers/$customerId',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { customerId } = Route.useParams();

  const { data: customer, isPending } = useQuery({
    queryKey: ['customers', customerId],
    queryFn: () => getCustomer(Number(customerId)),
    staleTime: Infinity
  })

  const { data: contacts } = useQuery({
    queryKey: ['customers', customerId, 'contacts'],
    queryFn: () => getCustomerContacts(Number(customerId)),
    staleTime: Infinity,
  })

  const queryClient = useQueryClient();
  const contactRemoval = useMutation({
    mutationFn: deleteCustomerContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'contacts'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Contact deleted');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mb-4 mt-2 flex shrink-0 justify-between items-center">
        {!isPending &&
          <h1>
            {customer?.name}
          </h1>
        }
      </div>
      <div id="customer_machines" className="flex justify-between mb-2">
        <h3 className="test">Machines</h3>
        <CreateMachineForm customer={customerId} />
      </div>
      <div className="flex flex-col gap-2">
        {customer?.machines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No machines yet</p>
        ) : (
          customer?.machines.map((machine) => (
            <div key={machine.id} className="text-sm flex gap-2 rounded-sm border p-4 items-center w-[400px] justify-center">
              <span className="font-bold text-xl">{machine.type}</span>
              {machine.location && <> - {machine.location}</>}
            </div>
          ))
        )}
      </div>

      <div id="customer_contacts" className="mt-6 mb-2 flex justify-between">
        <h3>Contacts</h3>
        <CreateContactForm customerId={Number(customerId)} />
      </div>
      <div className="flex flex-col gap-2">
        {contacts?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts yet</p>
        ) : (
          contacts?.map((contact) => (
            <div key={contact.id} className="text-sm flex justify-between gap-3 rounded-sm border p-4 w-[400px]">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{contact.name}</span>
                <a href={`tel:${contact.phoneNo}`} className="hover:underline">{contact.phoneNo}</a>
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="text-muted-foreground hover:underline">{contact.email}</a>
                )}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={contactRemoval.isPending}
                    title={`Delete ${contact.name}`}
                    aria-label={`Delete ${contact.name}`}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {contact.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the contact from {customer?.name ?? 'this customer'}. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="border-t-0 bg-transparent">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => contactRemoval.mutate(contact.id)}>
                      Delete Contact
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
