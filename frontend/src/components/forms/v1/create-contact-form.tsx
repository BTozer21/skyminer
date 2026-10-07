import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError, FieldSet, FieldLegend } from '@/components/ui/field';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createCustomerContact } from '@/lib/api';

export function CreateContactForm({ customerId }: { customerId: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (contact: Parameters<typeof createCustomerContact>[1]) =>
      createCustomerContact(customerId, contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', String(customerId), 'contacts'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Contact added');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: '',
      phoneNo: '',
      email: '',
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        name: value.name.trim(),
        phoneNo: value.phoneNo.trim(),
        email: value.email.trim() || null,
      });
      form.reset();
      setOpen(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button title="Add contact" aria-label="Add contact" variant="outline" size="icon">
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="w-full max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Contacts</FieldLegend>
                <FieldDescription>Add a contact for this customer</FieldDescription>
                <FieldGroup>
                  <form.Field
                    name="name"
                    validators={{
                      onSubmit: ({ value }) =>
                        value.trim() ? undefined : { message: 'Name is required' },
                    }}
                    children={(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="off"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      );
                    }}
                  />
                  <form.Field
                    name="phoneNo"
                    validators={{
                      onSubmit: ({ value }) =>
                        value.trim() ? undefined : { message: 'Phone number is required' },
                    }}
                    children={(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Phone number</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="tel"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="off"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      );
                    }}
                  />
                  <form.Field
                    name="email"
                    children={(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="email"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="off"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      );
                    }}
                  />
                </FieldGroup>
              </FieldSet>
              <Field orientation="horizontal">
                <Button variant="outline" type="button" onClick={() => form.reset()}>
                  Reset
                </Button>
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting…' : 'Submit'}
                    </Button>
                  )}
                </form.Subscribe>
              </Field>
            </FieldGroup>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
