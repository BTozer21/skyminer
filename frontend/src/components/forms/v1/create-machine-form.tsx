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
import { createMachine, getLocations } from '@/lib/api';
import { machines } from '@/lib/machines.ts';

export function CreateMachineForm({ location }: { location?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: locations, isPending } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
    staleTime: Infinity,
    enabled: !location,
  });

  const mutation = useMutation({
    mutationFn: createMachine,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['locations', String(variables.locationId)],
      });
      toast.success('Machine added');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      locationId: location ?? '',
      name: '',
      type: '',
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        locationId: Number(value.locationId),
        name: value.name.trim(),
        type: value.type.trim(),
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
        <Button title="Add machine" aria-label="Add machine" variant="outline" size="icon">
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
                <FieldLegend>Machines</FieldLegend>
                <FieldDescription>Add a Machine</FieldDescription>
                <FieldGroup>
                  {!location &&
                    <form.Field
                      name="locationId"
                      validators={{
                        onSubmit: ({ value }) =>
                          value ? undefined : { message: 'A Location must be selected' }
                      }}
                      children={(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Location</FieldLabel>
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
                                <SelectValue placeholder={isPending ? 'Loading locations…' : 'Select locations'} />
                              </SelectTrigger>
                              <SelectContent className="max-h-[400px]" side="bottom" position="popper">
                                {locations?.map((option) => (
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
                    name="type"
                    validators={{
                      onSubmit: ({ value }) =>
                        value.trim() ? undefined : { message: 'Type is required' },
                    }}
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Type</FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                          >
                            <SelectTrigger
                              id={field.name}
                              className="w-full"
                              aria-invalid={isInvalid}
                              onBlur={field.handleBlur}
                            >
                              <SelectValue placeholder="Machine" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[400px]" side="bottom" position="popper">
                              {machines.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      )
                    }}
                  />
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
                            placeholder="Name"
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



