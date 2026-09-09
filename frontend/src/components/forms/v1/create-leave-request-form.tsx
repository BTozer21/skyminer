import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isSameDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError, FieldSet, FieldLegend } from '@/components/ui/field';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { CalendarIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createLeaveRequest } from '@/lib/api';

interface CreateLeaveRequestFormProps {
  trigger?: React.ReactNode
}

export function CreateLeaveRequestForm({ trigger }: CreateLeaveRequestFormProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      // Same key myLeaveQuery sits under, so the home calendar picks the new
      // request up along with this page's list.
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Leave requested');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      // A single day off is a valid range: from and to are the same date.
      dateRange: undefined as DateRange | undefined,
      comment: '',
    },
    onSubmit: async ({ value }) => {
      const { from, to } = value.dateRange!;
      await mutation.mutateAsync({
        startDate: format(from!, 'yyyy-MM-dd'),
        endDate: format(to!, 'yyyy-MM-dd'),
        comment: value.comment.trim() || null,
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
        {trigger ?? (
          <Button title="Request leave" aria-label="Request leave" variant="outline" size="icon">
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
                <FieldLegend>Leave</FieldLegend>
                <FieldDescription>Request time off</FieldDescription>
                <FieldGroup>
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
                                  range.to && !isSameDay(range.from, range.to) ? (
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
                                // Leave is booked ahead, so past dates are out.
                                disabled={{ before: new Date() }}
                              />
                            </PopoverContent>
                          </Popover>
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      )
                    }}
                  />
                  <form.Field
                    name="comment"
                    children={(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Comment</FieldLabel>
                        <Textarea
                          id={field.name}
                          name={field.name}
                          placeholder="Comment"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          rows={3}
                        />
                      </Field>
                    )}
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
