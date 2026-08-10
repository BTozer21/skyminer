import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError, FieldSet, FieldLegend } from '@/components/ui/field';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { CalendarIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createJob, getClients } from '@/lib/api';

export function CreateJobForm() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: clients, isPending } = useQuery({ queryKey: ['clients'], queryFn: getClients, staleTime: Infinity });

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job added');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: '',
      dateRange: undefined as DateRange | undefined,
      clientId: '',
    },
    onSubmit: async ({ value }) => {
      const { from, to } = value.dateRange!;
      await mutation.mutateAsync({
        name: value.name.trim(),
        clientId: Number(value.clientId),
        startDate: format(from!, 'yyyy-MM-dd'),
        endDate: format(to!, 'yyyy-MM-dd'),
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
        <Button title="Add job" aria-label="Add job" variant="outline" size="icon">
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
                <FieldLegend>Job</FieldLegend>
                <FieldDescription>Create a job</FieldDescription>
                <FieldGroup>
                  <form.Field
                    name="clientId"
                    validators={{
                      onSubmit: ({ value }) =>
                        value ? undefined : { message: 'A Client must be selected' }
                    }}
                    children={(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Client</FieldLabel>
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
                              <SelectValue placeholder={isPending ? 'Loading clients…' : 'Select client'} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[400px]" side="bottom" position="popper">
                              {clients?.map((client) => (
                                <SelectItem key={client.id} value={String(client.id)}>
                                  {client.name}
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
                            placeholder="Job name"
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
                    name="dateRange"
                    validators={{
                      onSubmit: ({ value }) =>
                        value?.from && value?.to
                          ? undefined
                          : { message: 'A start and end date are required' },
                    }}
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      const range = field.state.value
                      return (
                        <Field data-invalid={isInvalid} className="w-60">
                          <FieldLabel htmlFor={field.name}>Date Range</FieldLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                id={field.name}
                                className="justify-start px-2.5 font-normal"
                                aria-invalid={isInvalid}
                                onBlur={field.handleBlur}
                              >
                                <CalendarIcon />
                                {range?.from ? (
                                  range.to ? (
                                    <>
                                      {format(range.from, 'LLL dd, y')} -{' '}
                                      {format(range.to, 'LLL dd, y')}
                                    </>
                                  ) : (
                                    format(range.from, 'LLL dd, y')
                                  )
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="range"
                                defaultMonth={range?.from}
                                selected={range}
                                onSelect={(next) => field.handleChange(next)}
                                numberOfMonths={2}
                              />
                            </PopoverContent>
                          </Popover>
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

