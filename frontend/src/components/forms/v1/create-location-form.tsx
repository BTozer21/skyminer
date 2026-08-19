import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError, FieldSet, FieldLegend } from '@/components/ui/field';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createLocation, getCustomers } from '@/lib/api';

export function CreateLocationForm({ customer }: { customer?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: customers, isPending } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    staleTime: Infinity,
    enabled: !customer,
  });

  const mutation = useMutation({
    mutationFn: createLocation,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['customers', String(variables.customerId)],
      });
      toast.success('Location added');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: '',
      customerId: customer ?? '',
      postCode: '',
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        name: value.name.trim(),
        customerId: Number(value.customerId),
        postCode: value.postCode.trim(),
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
        <Button title="Add location" aria-label="Add job" variant="outline" size="icon">
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
                <FieldLegend>Location</FieldLegend>
                <FieldDescription>Add a location</FieldDescription>
                <FieldGroup>
                  {customer &&
                    <form.Field
                      name="customerId"
                      validators={{
                        onSubmit: ({ value }) =>
                          value ? undefined : { message: 'A Customer must be selected' }
                      }}
                      children={(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Customer</FieldLabel>
                            <Select
                              value={field.state.value}
                              onValueChange={(value) => field.handleChange(value)}
                            >
                              <SelectTrigger
                                id={field.name}
                                className="w-full"
                                disabled={isPending}
                                aria-invalid={isInvalid}
                                onBlur={field.handleBlur}
                              >
                                <SelectValue placeholder={isPending ? 'Loading customers…' : 'Select customers'} />
                              </SelectTrigger>
                              <SelectContent className="max-h-[400px]" side="bottom" position="popper">
                                {customers?.map((option) => (
                                  <SelectItem key={option.id} value={String(option.id)}>
                                    {option.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        )
                      }}
                    />
                  }
                  <form.Field
                    name="name"
                    validators={{
                      onSubmit: ({ value }) =>
                        value.trim() ? undefined : { message: 'Name is required' },
                    }}
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            placeholder="Location"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="off"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      )
                    }}
                  />
                  <form.Field
                    name="postCode"
                    validators={{
                      onSubmit: ({ value }) =>
                        value.trim() ? undefined : { message: 'Post code is required' },
                    }}
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Post code</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            placeholder="XYZ 123"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="off"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      )
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


