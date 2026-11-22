'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, PageHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/form';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { applyApiErrors } from '@/lib/form';
import { graceSchema, shiftSchema } from '@/lib/schemas';
import type { Rules, Shift } from '@/lib/types';

const DAYS = [
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
  { n: 7, label: 'Sun' },
];
const dayNames = (days: number[]) => DAYS.filter((d) => days.includes(d.n)).map((d) => d.label).join(', ');

type ShiftValues = z.infer<typeof shiftSchema>;

function ShiftForm({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError: setFieldError,
    formState: { errors },
  } = useForm<ShiftValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime, workingDays: shift.workingDays },
  });
  const days = watch('workingDays');
  const save = useMutation({
    mutationFn: (v: ShiftValues) => api.put(`/shifts/${shift.id}`, v),
    onSuccess: () => {
      toast.success('Shift updated.');
      qc.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
    onError: (e) => {
      if (!applyApiErrors(e, setFieldError)) setError(errorMessage(e));
      else setError('');
    },
  });
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="flex flex-col gap-3" data-testid="shift-form">
      {error && (
        <p role="alert" data-testid="shift-form-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Field label="Name" error={errors.name?.message}>
        <Input data-testid="shift-name" {...register('name')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start time" error={errors.startTime?.message}>
          <Input type="time" data-testid="shift-start" {...register('startTime')} />
        </Field>
        <Field label="End time" error={errors.endTime?.message}>
          <Input type="time" data-testid="shift-end" {...register('endTime')} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Working days</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <label key={d.n} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm transition-colors hover:bg-surface-2">
              <input
                type="checkbox"
                checked={days.includes(d.n)}
                onChange={(e) => setValue('workingDays', e.target.checked ? [...days, d.n].sort() : days.filter((x) => x !== d.n), { shouldValidate: true })}
                data-testid={`shift-day-${d.label.toLowerCase()}`}
              />
              {d.label}
            </label>
          ))}
        </div>
        {errors.workingDays && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {errors.workingDays.message}
          </p>
        )}
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} data-testid="shift-cancel">
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} data-testid="shift-save">
          Save shift
        </Button>
      </div>
    </form>
  );
}

function GraceForm({ rules }: { rules: Rules }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<z.infer<typeof graceSchema>>({ resolver: zodResolver(graceSchema), defaultValues: { graceMinutes: rules.graceMinutes } });
  const save = useMutation({
    mutationFn: (v: { graceMinutes: number }) => api.put('/rules', v),
    onSuccess: () => {
      toast.success('Grace period updated.');
      setError('');
      qc.invalidateQueries({ queryKey: ['rules'] });
    },
    onError: (e) => {
      if (!applyApiErrors(e, setFieldError)) setError(errorMessage(e));
      else setError('');
    },
  });
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="flex max-w-sm flex-col gap-3" data-testid="grace-form">
      {error && (
        <p role="alert" data-testid="grace-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Field label="Grace period (minutes)" error={errors.graceMinutes?.message} hint="0 to 60 minutes.">
        <Input type="number" inputMode="numeric" data-testid="grace-input" {...register('graceMinutes', { valueAsNumber: true })} />
      </Field>
      <Button type="submit" loading={save.isPending} data-testid="grace-save" className="self-start">
        Save grace period
      </Button>
    </form>
  );
}

export function RulesView() {
  const [editing, setEditing] = useState<Shift | null>(null);
  const shifts = useQuery({ queryKey: ['shifts'], queryFn: () => api.get<Shift[]>('/shifts') });
  const rules = useQuery({ queryKey: ['rules'], queryFn: () => api.get<Rules>('/rules') });

  return (
    <>
      <PageHeader title="Shifts and rules" subtitle="Working hours and attendance rules." />
      <div className="animate-slide-up space-y-5">
        <Card>
          <CardTitle>Shifts</CardTitle>
          {shifts.isLoading ? (
            <SkeletonRows rows={2} />
          ) : shifts.error ? (
            <ErrorState message={errorMessage(shifts.error)} onRetry={() => shifts.refetch()} />
          ) : (
            <Table caption="Shifts" data-testid="shifts-table">
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Hours</TH>
                  <TH>Working days</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {shifts.data?.map((s) => (
                  <TR key={s.id} data-testid={`shift-row-${s.id}`}>
                    <TD>
                      {s.name} {s.isDefault && <Badge className="ml-1 bg-primary/10 text-primary">Default</Badge>}
                    </TD>
                    <TD>
                      {s.startTime} to {s.endTime}
                    </TD>
                    <TD>{dayNames(s.workingDays)}</TD>
                    <TD>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(s)} data-testid={`shift-edit-${s.id}`}>
                        Edit
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardTitle>Attendance rules</CardTitle>
          {rules.isLoading ? (
            <SkeletonRows rows={2} />
          ) : rules.error || !rules.data ? (
            <ErrorState message={errorMessage(rules.error)} onRetry={() => rules.refetch()} />
          ) : (
            <div className="space-y-4">
              <GraceForm key={rules.data.graceMinutes} rules={rules.data} />
              <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3" data-testid="rules-readonly">
                <div>
                  <dt className="text-muted">Check-in window</dt>
                  <dd>
                    {rules.data.checkInOpenTime} to {rules.data.checkInCloseTime}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Check-out closes</dt>
                  <dd>{rules.data.checkOutCloseTime}</dd>
                </div>
                <div>
                  <dt className="text-muted">Present at least</dt>
                  <dd>{rules.data.presentMinMinutes / 60} hours</dd>
                </div>
                <div>
                  <dt className="text-muted">Half day at least</dt>
                  <dd>{rules.data.halfDayMinMinutes / 60} hours</dd>
                </div>
                <div>
                  <dt className="text-muted">Late days before deduction</dt>
                  <dd>{rules.data.lateLimitPerMonth} per month</dd>
                </div>
              </dl>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit shift" testid="shift-dialog">
        {editing && <ShiftForm key={editing.id} shift={editing} onClose={() => setEditing(null)} />}
      </Dialog>
    </>
  );
}
