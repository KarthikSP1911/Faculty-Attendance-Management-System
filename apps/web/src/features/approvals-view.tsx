'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/card';
import { RequestBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Pagination, TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { LeaveRequest, Page, Regularization } from '@/lib/types';
import { cn, fmtDate, humanize } from '@/lib/utils';

type Tab = 'leave' | 'regularization';
type Target = { kind: Tab; id: string; name: string; action: 'approve' | 'reject' };

/** Approvals queue for HODs (own department) and admins (everyone). Own requests are excluded. */
export function ApprovalsView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'regularization' ? 'regularization' : 'leave',
  );
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Target | null>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');

  const own = user?.faculty?.id;
  const leave = useQuery({
    queryKey: ['leave', 'queue', status, page],
    queryFn: () => api.get<Page<LeaveRequest>>('/leave', { status, page, pageSize: 10 }),
    enabled: tab === 'leave',
  });
  const reg = useQuery({
    queryKey: ['regularization', 'queue', status, page],
    queryFn: () => api.get<Page<Regularization>>('/regularization', { status, page, pageSize: 10 }),
    enabled: tab === 'regularization',
  });

  const close = () => {
    setTarget(null);
    setComment('');
    setCommentError('');
  };
  const review = useMutation({
    mutationFn: (t: Target) => api.post(`/${t.kind}/${t.id}/${t.action}`, { comment: comment.trim() || undefined }),
    onSuccess: (_d, t) => {
      toast.success(t.action === 'approve' ? 'Request approved.' : 'Request rejected.');
      close();
      qc.invalidateQueries({ queryKey: ['leave'] });
      qc.invalidateQueries({ queryKey: ['regularization'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      close();
    },
  });

  const confirm = () => {
    if (!target) return;
    if (target.action === 'reject' && comment.trim().length < 3) return setCommentError('A comment of at least 3 characters is required to reject.');
    review.mutate(target);
  };

  const active = tab === 'leave' ? leave : reg;
  const items = ((active.data?.items ?? []) as (LeaveRequest | Regularization)[]).filter((r) => r.facultyId !== own);

  const actions = (kind: Tab, id: string, name: string, s: string) =>
    s === 'PENDING' ? (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setTarget({ kind, id, name, action: 'approve' })} data-testid={`approve-${id}`}>
          Approve
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setTarget({ kind, id, name, action: 'reject' })} data-testid={`reject-${id}`}>
          Reject
        </Button>
      </div>
    ) : null;

  return (
    <>
      <PageHeader title="Approvals" subtitle="Review leave and regularization requests." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Request type" className="inline-flex rounded-xl border border-line bg-surface-2 p-1 shadow-sm">
          {(['leave', 'regularization'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              data-testid={`approvals-tab-${t}`}
              onClick={() => {
                setTab(t);
                setPage(1);
              }}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                tab === t ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:bg-surface/60 hover:text-foreground',
              )}
            >
              {humanize(t)}
            </button>
          ))}
        </div>
        <Select
          className="h-9 w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          data-testid="approvals-filter-status"
        >
          {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </div>

      {active.isLoading ? (
        <SkeletonRows />
      ) : active.error ? (
        <ErrorState message={errorMessage(active.error)} onRetry={() => active.refetch()} />
      ) : items.length === 0 ? (
        <div className="animate-slide-up">
          <EmptyState title={`No ${status.toLowerCase()} ${tab} requests`} testid="approvals-empty" />
        </div>
      ) : (
        <div className="animate-slide-up">
          <Table caption={`${tab} requests`} data-testid={`approvals-table-${tab}`}>
            <THead>
              <TR>
                <TH>Faculty</TH>
                <TH>{tab === 'leave' ? 'Leave' : 'Date'}</TH>
                <TH>Reason</TH>
                <TH>Status</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {tab === 'leave'
                ? (items as LeaveRequest[]).map((l) => (
                    <TR key={l.id} data-testid={`approval-row-${l.id}`}>
                      <TD>{l.facultyName}</TD>
                      <TD>
                        {l.leaveType.code}: {fmtDate(l.startDate)}
                        {l.endDate !== l.startDate && ` - ${fmtDate(l.endDate)}`} ({l.days}d)
                      </TD>
                      <TD className="max-w-xs">{l.reason}</TD>
                      <TD>
                        <RequestBadge status={l.status} />
                      </TD>
                      <TD>{actions('leave', l.id, l.facultyName, l.status)}</TD>
                    </TR>
                  ))
                : (items as Regularization[]).map((r) => (
                    <TR key={r.id} data-testid={`approval-row-${r.id}`}>
                      <TD>{r.facultyName}</TD>
                      <TD>
                        {fmtDate(r.date)}: {r.requestedCheckIn ?? '--'} to {r.requestedCheckOut ?? '--'}
                      </TD>
                      <TD className="max-w-xs">{r.reason}</TD>
                      <TD>
                        <RequestBadge status={r.status} />
                      </TD>
                      <TD>{actions('regularization', r.id, r.facultyName, r.status)}</TD>
                    </TR>
                  ))}
            </TBody>
          </Table>
          {active.data && <Pagination page={page} pageSize={10} total={active.data.total} onPage={setPage} testid="approvals-pagination" />}
        </div>
      )}

      <Dialog
        open={!!target}
        onClose={close}
        title={target?.action === 'approve' ? 'Approve request' : 'Reject request'}
        description={target ? `Request from ${target.name}.` : undefined}
        testid="review-dialog"
      >
        <Field label={target?.action === 'reject' ? 'Comment (required)' : 'Comment (optional)'} error={commentError}>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={300} data-testid="review-comment" />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={close} data-testid="review-cancel">
            Cancel
          </Button>
          <Button variant={target?.action === 'reject' ? 'danger' : 'primary'} onClick={confirm} loading={review.isPending} data-testid="review-confirm">
            {target?.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
