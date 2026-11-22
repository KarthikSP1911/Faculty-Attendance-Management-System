'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, PageHeader } from '@/components/ui/card';
import { RequestBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Pagination, TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { applyApiErrors } from '@/lib/form';
import { leaveSchema } from '@/lib/schemas';
import type { LeaveBalance, LeaveRequest, LeaveType, Page } from '@/lib/types';
import { fmtDate, humanize, num, todayKey } from '@/lib/utils';

type Values = z.infer<typeof leaveSchema>;

export function LeaveView() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);

  const types = useQuery({ queryKey: ['leave', 'types'], queryFn: () => api.get<LeaveType[]>('/leave/types') });
  const balances = useQuery({ queryKey: ['leave', 'balances'], queryFn: () => api.get<LeaveBalance[]>('/leave/balances') });
  const list = useQuery({
    queryKey: ['leave', 'list', page, status],
    queryFn: () => api.get<Page<LeaveRequest>>('/leave', { page, pageSize: 10, status }),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { leaveTypeId: '', startDate: todayKey(), endDate: todayKey(), halfDay: 'NONE', reason: '' },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['leave'] }).then(() => qc.invalidateQueries({ queryKey: ['dashboard'] }));
  const create = useMutation({
    mutationFn: (v: Values & { draft: boolean }) => api.post<LeaveRequest>('/leave', v),
    onSuccess: (_d, v) => {
      toast.success(v.draft ? 'Draft saved.' : 'Leave request submitted.');
      setError('');
      reset({ leaveTypeId: '', startDate: todayKey(), endDate: todayKey(), halfDay: 'NONE', reason: '' });
      refresh();
    },
    onError: (e) => {
      if (!applyApiErrors(e, setFieldError)) setError(errorMessage(e));
      else setError('');
    },
  });
  const submitDraft = useMutation({
    mutationFn: (id: string) => api.post(`/leave/${id}/submit`),
    onSuccess: () => {
      toast.success('Leave request submitted.');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/leave/${id}/cancel`),
    onSuccess: () => {
      toast.success('Leave request cancelled.');
      setCancelId(null);
      refresh();
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      setCancelId(null);
    },
  });

  const send = (draft: boolean) => handleSubmit((v) => create.mutate({ ...v, draft }));

  return (
    <>
      <PageHeader title="Leave" subtitle="Apply for leave and track your requests." />

      <section aria-label="Leave balances" className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="leave-balances">
        {balances.isLoading && <SkeletonRows rows={1} />}
        {balances.data?.map((b) => (
          <Card key={b.id} className="lift animate-slide-up p-4"data-testid={`leave-balance-${b.leaveType.code.toLowerCase()}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{b.leaveType.name}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{num(b.allotted) - num(b.used)}</p>
            <p className="text-xs text-muted">
              of {num(b.allotted)} left, {num(b.used)} used
            </p>
          </Card>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle>Apply for leave</CardTitle>
          <form onSubmit={send(false)} noValidate className="flex flex-col gap-4 lg:gap-5" data-testid="leave-form">
            {error && (
              <p role="alert" data-testid="leave-error" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
                {error}
              </p>
            )}
            <Field label="Leave type" error={errors.leaveTypeId?.message}>
              <Select data-testid="leave-type" {...register('leaveTypeId')}>
                <option value="">Select type</option>
                {types.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" error={errors.startDate?.message}>
                <Input type="date" data-testid="leave-start" {...register('startDate')} />
              </Field>
              <Field label="To" error={errors.endDate?.message}>
                <Input type="date" data-testid="leave-end" {...register('endDate')} />
              </Field>
            </div>
            <Field label="Half day" error={errors.halfDay?.message}>
              <Select data-testid="leave-half-day" {...register('halfDay')}>
                <option value="NONE">Full day(s)</option>
                <option value="FIRST_HALF">First half</option>
                <option value="SECOND_HALF">Second half</option>
              </Select>
            </Field>
            <Field label="Reason" error={errors.reason?.message} hint="10 to 300 characters.">
              <Textarea data-testid="leave-reason" {...register('reason')} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={create.isPending} data-testid="leave-apply-submit">
                Submit request
              </Button>
              <Button type="button" variant="secondary" onClick={send(true)} disabled={create.isPending} data-testid="leave-save-draft">
                Save as draft
              </Button>
            </div>
          </form>
        </Card>

        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">My leave requests</h2>
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only sm:not-sr-only">Status</span>
              <Select
                className="h-9 w-40"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                data-testid="leave-filter-status"
                aria-label="Filter by status"
              >
                <option value="">All</option>
                {['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {list.isLoading ? (
            <SkeletonRows />
          ) : list.error ? (
            <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
          ) : list.data && list.data.items.length === 0 ? (
            <div className="animate-slide-up">
              <EmptyState title="No leave requests" hint="Requests you submit will appear here." testid="leave-empty" />
            </div>
          ) : (
            <>
              <Table caption="My leave requests" data-testid="leave-table">
                <THead>
                  <TR>
                    <TH>Type</TH>
                    <TH>Dates</TH>
                    <TH>Days</TH>
                    <TH>Status</TH>
                    <TH>Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {list.data?.items.map((l) => (
                    <TR key={l.id} data-testid={`leave-row-${l.id}`}>
                      <TD>{l.leaveType.code}</TD>
                      <TD>
                        {fmtDate(l.startDate)}
                        {l.endDate !== l.startDate && ` - ${fmtDate(l.endDate)}`}
                        {l.halfDay !== 'NONE' && <span className="block text-xs text-muted">{humanize(l.halfDay)}</span>}
                      </TD>
                      <TD>{l.days}</TD>
                      <TD>
                        <RequestBadge status={l.status} />
                        {l.reviewComment && <span className="mt-1 block text-xs text-muted">{l.reviewComment}</span>}
                      </TD>
                      <TD>
                        <div className="flex gap-2">
                          {l.status === 'DRAFT' && (
                            <Button size="sm" variant="secondary" onClick={() => submitDraft.mutate(l.id)} data-testid={`leave-submit-${l.id}`}>
                              Submit
                            </Button>
                          )}
                          {['DRAFT', 'PENDING', 'APPROVED'].includes(l.status) && (
                            <Button size="sm" variant="ghost" onClick={() => setCancelId(l.id)} data-testid={`leave-cancel-${l.id}`}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              {list.data && <Pagination page={page} pageSize={10} total={list.data.total} onPage={setPage} testid="leave-pagination" />}
            </>
          )}
        </div>
      </div>

      <Dialog open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel this leave request?" description="Cancelled leave returns to your balance." testid="leave-cancel-dialog">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCancelId(null)} data-testid="leave-cancel-no">
            Keep it
          </Button>
          <Button variant="danger" loading={cancel.isPending} onClick={() => cancelId && cancel.mutate(cancelId)} data-testid="leave-cancel-confirm">
            Cancel request
          </Button>
        </div>
      </Dialog>
    </>
  );
}
