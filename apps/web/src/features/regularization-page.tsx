'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, PageHeader } from '@/components/ui/card';
import { RequestBadge } from '@/components/ui/badge';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Pagination, TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { applyApiErrors } from '@/lib/form';
import { regularizationSchema } from '@/lib/schemas';
import type { Page, Regularization } from '@/lib/types';
import { fmtDate, todayKey } from '@/lib/utils';

type Values = z.infer<typeof regularizationSchema>;
const blank = (): Values => ({ date: todayKey(), requestedCheckIn: '', requestedCheckOut: '', reason: '' });

export function RegularizationView() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const list = useQuery({ queryKey: ['regularization', 'list', page], queryFn: () => api.get<Page<Regularization>>('/regularization', { page, pageSize: 10 }) });

  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(regularizationSchema), defaultValues: blank() });

  const create = useMutation({
    mutationFn: (v: Values) =>
      api.post('/regularization', { date: v.date, requestedCheckIn: v.requestedCheckIn || null, requestedCheckOut: v.requestedCheckOut || null, reason: v.reason }),
    onSuccess: () => {
      toast.success('Regularization request submitted.');
      setError('');
      reset(blank());
      qc.invalidateQueries({ queryKey: ['regularization'] });
    },
    onError: (e) => {
      if (!applyApiErrors(e, setFieldError)) setError(errorMessage(e));
      else setError('');
    },
  });

  return (
    <>
      <PageHeader title="Regularization" subtitle="Correct a missed or wrong punch from the last 7 days. Up to 3 requests per month." />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle>New request</CardTitle>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} noValidate className="flex flex-col gap-4" data-testid="regularization-form">
            {error && (
              <p role="alert" data-testid="regularization-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
                {error}
              </p>
            )}
            <Field label="Date" error={errors.date?.message}>
              <Input type="date" max={todayKey()} data-testid="reg-date" {...register('date')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check-in time" error={errors.requestedCheckIn?.message}>
                <Input type="time" data-testid="reg-check-in" {...register('requestedCheckIn')} />
              </Field>
              <Field label="Check-out time" error={errors.requestedCheckOut?.message}>
                <Input type="time" data-testid="reg-check-out" {...register('requestedCheckOut')} />
              </Field>
            </div>
            <Field label="Reason" error={errors.reason?.message} hint="10 to 300 characters.">
              <Textarea data-testid="reg-reason" {...register('reason')} />
            </Field>
            <Button type="submit" loading={create.isPending} data-testid="reg-submit">
              Submit request
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          <h2 className="mb-3 text-base font-semibold">My requests</h2>
          {list.isLoading ? (
            <SkeletonRows />
          ) : list.error ? (
            <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
          ) : list.data && list.data.items.length === 0 ? (
            <EmptyState title="No regularization requests" testid="regularization-empty" />
          ) : (
            <>
              <Table caption="My regularization requests" data-testid="regularization-table">
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>In</TH>
                    <TH>Out</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {list.data?.items.map((r) => (
                    <TR key={r.id} data-testid={`regularization-row-${r.id}`}>
                      <TD>{fmtDate(r.date)}</TD>
                      <TD>{r.requestedCheckIn ?? '--'}</TD>
                      <TD>{r.requestedCheckOut ?? '--'}</TD>
                      <TD>
                        <RequestBadge status={r.status} />
                        {r.reviewComment && <span className="mt-1 block text-xs text-muted">{r.reviewComment}</span>}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              {list.data && <Pagination page={page} pageSize={10} total={list.data.total} onPage={setPage} testid="regularization-pagination" />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
