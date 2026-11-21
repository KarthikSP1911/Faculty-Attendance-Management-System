'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { applyApiErrors } from '@/lib/form';
import { holidaySchema } from '@/lib/schemas';
import type { Holiday } from '@/lib/types';
import { fmtDate, humanize, todayKey } from '@/lib/utils';
import { HOLIDAY_CLASS, YearSelect } from './holidays-view';

type Values = z.infer<typeof holidaySchema>;

function HolidayForm({ editing, year, onClose }: { editing: Holiday | null; year: number; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(holidaySchema),
    defaultValues: editing ? { date: editing.date, name: editing.name, type: editing.type } : { date: `${year}-${todayKey().slice(5)}`, name: '', type: 'INSTITUTIONAL' },
  });
  const save = useMutation({
    mutationFn: (v: Values) => (editing ? api.put(`/holidays/${editing.id}`, v) : api.post('/holidays', v)),
    onSuccess: () => {
      toast.success(editing ? 'Holiday updated.' : 'Holiday added.');
      qc.invalidateQueries({ queryKey: ['holidays'] });
      onClose();
    },
    onError: (e) => {
      if (!applyApiErrors(e, setFieldError)) setError(errorMessage(e));
      else setError('');
    },
  });
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="flex flex-col gap-3" data-testid="holiday-form">
      {error && (
        <p role="alert" data-testid="holiday-form-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Field label="Date" error={errors.date?.message}>
        <Input type="date" data-testid="holiday-date" {...register('date')} />
      </Field>
      <Field label="Name" error={errors.name?.message}>
        <Input data-testid="holiday-name" {...register('name')} />
      </Field>
      <Field label="Type" error={errors.type?.message}>
        <Select data-testid="holiday-type" {...register('type')}>
          {['NATIONAL', 'INSTITUTIONAL', 'OPTIONAL'].map((t) => (
            <option key={t} value={t}>
              {humanize(t)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} data-testid="holiday-cancel">
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} data-testid="holiday-save">
          Save
        </Button>
      </div>
    </form>
  );
}

export function HolidaysAdminView() {
  const qc = useQueryClient();
  const toast = useToast();
  const [year, setYear] = useState(Number(todayKey().slice(0, 4)));
  const [form, setForm] = useState<{ editing: Holiday | null } | null>(null);
  const [deleting, setDeleting] = useState<Holiday | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['holidays', year], queryFn: () => api.get<Holiday[]>('/holidays', { year }) });
  const remove = useMutation({
    mutationFn: (h: Holiday) => api.del(`/holidays/${h.id}`),
    onSuccess: () => {
      toast.success('Holiday deleted.');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      setDeleting(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Holidays"
        subtitle="Manage the holiday calendar (demo data)."
        actions={
          <>
            <YearSelect year={year} onChange={setYear} />
            <Button onClick={() => setForm({ editing: null })} data-testid="holiday-create-open">
              <Plus className="h-4 w-4" aria-hidden />
              Add holiday
            </Button>
          </>
        }
      />
      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data && data.length === 0 ? (
        <EmptyState title={`No holidays for ${year}`} testid="holidays-empty" />
      ) : (
        <Table caption="Holidays" data-testid="holidays-table">
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Name</TH>
              <TH>Type</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {data?.map((h) => (
              <TR key={h.id} data-testid={`holiday-row-${h.date}`}>
                <TD>{fmtDate(h.date)}</TD>
                <TD>{h.name}</TD>
                <TD>
                  <Badge className={HOLIDAY_CLASS[h.type]}>{humanize(h.type)}</Badge>
                </TD>
                <TD>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setForm({ editing: h })} data-testid={`holiday-edit-${h.date}`}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(h)} data-testid={`holiday-delete-${h.date}`}>
                      Delete
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.editing ? 'Edit holiday' : 'Add holiday'} testid="holiday-dialog">
        {form && <HolidayForm key={form.editing?.id ?? 'new'} editing={form.editing} year={year} onClose={() => setForm(null)} />}
      </Dialog>
      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete holiday?" description={deleting ? `${deleting.name} on ${fmtDate(deleting.date)}.` : undefined} testid="holiday-delete-dialog">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)} data-testid="holiday-delete-no">
            Cancel
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting)} data-testid="holiday-delete-confirm">
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
