'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Field, Select } from '@/components/ui/form';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { api, errorMessage } from '@/lib/api';
import type { Page } from '@/lib/types';
import { fmtDateTime } from '@/lib/utils';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  actor: { email: string } | null;
}

const ENTITIES = ['Department', 'Faculty', 'Shift', 'AttendanceRule', 'Holiday', 'LeaveRequest', 'RegularizationRequest', 'AttendanceRecord', 'AbsentJob'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'CORRECTION'];

export function AuditView() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit', page, entity, action],
    queryFn: () => api.get<Page<AuditEntry>>('/audit', { page, pageSize: 20, entity, action }),
  });

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every create, update, delete and correction, newest first." />
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end" data-testid="audit-filters">
        <Field label="Entity">
          <Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} data-testid="audit-entity">
            <option value="">All</option>
            {ENTITIES.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </Select>
        </Field>
        <Field label="Action">
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} data-testid="audit-action">
            <option value="">All</option>
            {ACTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
      </div>
      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : !data?.items.length ? (
        <EmptyState title="No audit entries" testid="audit-empty" />
      ) : (
        <>
          <div className="animate-slide-up overflow-x-auto" data-testid="audit-table">
            <Table caption="Audit log">
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Who</TH>
                  <TH>Action</TH>
                  <TH>Entity</TH>
                  <TH>Change</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((a) => (
                  <TR key={a.id} data-testid={`audit-row-${a.id}`} className="transition-colors hover:bg-surface-2/60">
                    <TD className="whitespace-nowrap">{fmtDateTime(a.createdAt)}</TD>
                    <TD>{a.actor?.email ?? 'system'}</TD>
                    <TD>
                      <Badge>{a.action}</Badge>
                    </TD>
                    <TD>{a.entity}</TD>
                    <TD>
                      <details>
                        <summary className="cursor-pointer text-primary hover:underline">View</summary>
                        <pre className="mt-1 max-w-md overflow-auto rounded-lg bg-surface-2 p-2 text-xs">{JSON.stringify({ old: a.oldValue, new: a.newValue }, null, 2)}</pre>
                      </details>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <Pagination page={page} pageSize={20} total={data.total} onPage={setPage} testid="audit-pagination" />
        </>
      )}
    </>
  );
}
