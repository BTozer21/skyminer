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
import { CalendarIcon, Crown, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createJob, createJobAssignment, getCustomers, listUsers } from '@/lib/api';
import type { JobRole } from '@/lib/api';

// Held in form state until the job exists: assignments need a job id, and the
// job isn't created until submit.
interface DraftAssignee {
  userId: string
  name: string
  role: JobRole
}

interface CreateJobFormProps {
  defaultDate?: Date
  initialAssignee?: { userId: string; name: string }
  trigger?: React.ReactNode
  onCreated?: (jobId: number) => void
}

export function CreateJobForm({ defaultDate, initialAssignee, trigger, onCreated }: CreateJobFormProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: customers, isPending } = useQuery({ queryKey: ['customers'], queryFn: getCustomers, staleTime: Infinity });
  // Same key the team page uses, so this is usually served from cache.
  const { data: users, isPending: usersPending } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => listUsers(),
  });

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
      // A single day is a valid range: from and to are the same date.
      dateRange: (defaultDate
        ? { from: defaultDate, to: defaultDate }
        : undefined) as DateRange | undefined,
      customerId: '',
      assignees: (initialAssignee
        ? [{ ...initialAssignee, role: 'member' }]
        : []) as DraftAssignee[],
    },
    onSubmit: async ({ value }) => {
      const { from, to } = value.dateRange!;
      const job = await mutation.mutateAsync({
        name: value.name.trim(),
        customerId: Number(value.customerId),
        startDate: format(from!, 'yyyy-MM-dd'),
        endDate: format(to!, 'yyyy-MM-dd'),
      });

      form.reset();
      setOpen(false);
      onCreated?.(job.id);

      // The job is already created, so a failure here can't roll it back —
      // name who didn't stick rather than swallowing it, and keep going.
      const failed: string[] = [];
      await Promise.all(
        value.assignees.map(async (assignee) => {
          try {
            await createJobAssignment({
              jobId: job.id,
              userId: assignee.userId,
              role: assignee.role,
            });
          } catch {
            failed.push(assignee.name);
          }
        }),
      );
      if (failed.length) {
        toast.error(`Could not assign ${failed.join(', ')} — add them from the job`);
      }

      queryClient.invalidateQueries({ queryKey: ['schedule'] });
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
        {trigger ?? (
          <Button title="Add job" aria-label="Add job" variant="outline" size="icon">
            <Plus />
          </Button>
        )}
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
                              {customers?.map((customer) => (
                                <SelectItem key={customer.id} value={String(customer.id)}>
                                  {customer.name}
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
                  <form.Field
                    name="assignees"
                    children={(field) => {
                      const assignees = field.state.value;
                      const isPicked = (id: string) =>
                        assignees.some((assignee) => assignee.userId === id);

                      const toggleUser = (id: string, name: string) =>
                        field.handleChange(
                          isPicked(id)
                            ? assignees.filter((assignee) => assignee.userId !== id)
                            : [...assignees, { userId: id, name, role: 'member' as JobRole }],
                        );

                      // One lead per job: promoting demotes everyone else here,
                      // before submit, so the insert can't trip the unique index.
                      const toggleLead = (id: string) =>
                        field.handleChange(
                          assignees.map((assignee) => ({
                            ...assignee,
                            role:
                              assignee.userId === id && assignee.role !== 'lead'
                                ? 'lead'
                                : 'member',
                          })),
                        );

                      return (
                        <Field>
                          <FieldLabel>Team</FieldLabel>
                          {usersPending ? (
                            <p className="text-muted-foreground text-sm">Loading team…</p>
                          ) : (
                            <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                              {users?.users.map((user) => {
                                const picked = assignees.find(
                                  (assignee) => assignee.userId === user.id,
                                );
                                const isLead = picked?.role === 'lead';

                                return (
                                  <li
                                    key={user.id}
                                    data-selected={Boolean(picked)}
                                    className="bg-muted/40 data-[selected=true]:!border-blue-500 data-[selected=true]:bg-blue-500/10 flex items-center gap-1 rounded-sm border border-transparent pr-1"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleUser(user.id, user.name)}
                                      aria-pressed={Boolean(picked)}
                                      className="flex-1 px-2 py-1 text-left text-sm"
                                    >
                                      {user.name}
                                    </button>
                                    {/* Only someone on the job can lead it. */}
                                    {picked && (
                                      <Button
                                        type="button"
                                        onClick={() => toggleLead(user.id)}
                                        title={isLead ? 'Team lead' : `Make ${user.name} team lead`}
                                        aria-label={isLead ? 'Team lead' : `Make ${user.name} team lead`}
                                        aria-pressed={isLead}
                                        variant="ghost"
                                        size="icon"
                                        className={`size-6 ${isLead ? '!border-amber-500' : ''} hover:!border-amber-500 transition-all duration-200`}
                                      >
                                         <Crown
                                          className={isLead ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}
                                        />
                                      </Button>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
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

