'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, PageHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import type { Department } from '@/lib/types';
import { monthKey, todayKey } from '@/lib/utils';

type Kind = 'daily' | 'monthly' | 'range' | 'muster';
type Row = Record<string, unknown> & { counts?: Record<string, number> };

const KINDS: Array<{ key: Kind; label: string }> = [
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'range', label: 'Custom range' },
  { key: 'muster', label: 'Muster roll' },
];

export function ReportsView() {
  const toast = useToast();
  const [kind, setKind] = useState<Kind>('monthly');
  const [date, setDate] = useState(todayKey());
  const [month, setMonth] = useState(monthKey());
  const [from, setFrom] = useState(`${monthKey()}-01`);
  const [to, setTo] = useState(todayKey());
  const [departmentId, setDepartmentId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const depts = useQuery({ queryKey: ['departments'], queryFn: () => api.get<Department[]>('/departments') });
  const params =
    kind === 'daily' ? { date, departmentId } : kind === 'range' ? { from, to, departmentId } : { month, departmentId };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['report', kind, params],
    queryFn: () => api.get<unknown>(`/reports/${kind}`, params),
  });

  const download = async (format: 'csv' | 'pdf') => {
    setBusy(format);
    try {
      await api.download(`/reports/${kind}`, { ...params, format }, `${kind}-report.${format}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const muster = kind === 'muster' ? (data as { days: string[]; rows: Array<{ employeeId: string; fullName: string; codes: string[]; percentage: number }> } | undefined) : undefined;
  const rows = kind !== 'muster' ? ((data as Row[] | undefined) ?? []) : [];

  return (
    <>
      <PageHeader title="Reports" subtitle="Demo data. Percentages follow the formula in the test plan." />
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3" data-testid="report-filters">
          <Field label="Report">
            <Select value={kind} onChange={(e) => setKind(e.target.value as Kind)} data-testid="report-kind">
              {KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </Select>
          </Field>
          {kind === 'daily' && (
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="report-date" />
            </Field>
          )}
          {(kind === 'monthly' || kind === 'muster') && (
            <Field label="Month">
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="report-month" />
            </Field>
          )}
          {kind === 'range' && (
            <>
              <Field label="From">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="report-from" />
              </Field>
              <Field label="To">
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="report-to" />
              </Field>
            </>
          )}
          <Field label="Department">
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} data-testid="report-department">
              <option value="">All</option>
              {depts.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => download('csv')} loading={busy === 'csv'} data-testid="report-export-csv">
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => download('pdf')} loading={busy === 'pdf'} data-testid="report-export-pdf">
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : kind === 'muster' ? (
        !muster?.rows.length ? (
          <EmptyState title="No data for this selection" testid="report-empty" />
        ) : (
          <div className="overflow-x-auto" data-testid="report-table">
            <Table caption="Muster roll. P present, L late, HD half day, A absent, OL on leave, H holiday, WO weekly off.">
              <THead>
                <TR>
                  <TH>Employee</TH>
                  {muster.days.map((d) => (
                    <TH key={d} className="px-1 text-center">
                      {d.slice(8)}
                    </TH>
                  ))}
                  <TH>%</TH>
                </TR>
              </THead>
              <TBody>
                {muster.rows.map((r) => (
                  <TR key={r.employeeId} data-testid={`report-row-${r.employeeId}`}>
                    <TD className="whitespace-nowrap">
                      {r.employeeId} {r.fullName}
                    </TD>
                    {r.codes.map((c, i) => (
                      <TD key={i} className="px-1 text-center text-xs">
                        {c}
                      </TD>
                    ))}
                    <TD>{r.percentage}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )
      ) : rows.length === 0 ? (
        <EmptyState title="No data for this selection" testid="report-empty" />
      ) : kind === 'daily' ? (
        <div className="overflow-x-auto" data-testid="report-table">
          <Table caption="Daily attendance">
            <THead>
              <TR>
                <TH>Employee</TH>
                <TH>Dept</TH>
                <TH>Status</TH>
                <TH>Worked (min)</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={String(r.employeeId)} data-testid={`report-row-${r.employeeId}`}>
                  <TD>
                    {String(r.employeeId)} {String(r.fullName)}
                  </TD>
                  <TD>{String(r.department)}</TD>
                  <TD>{String(r.status ?? '--')}</TD>
                  <TD>{String(r.workedMinutes ?? '--')}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      ) : (
        <div className="overflow-x-auto" data-testid="report-table">
          <Table caption="Attendance summary">
            <THead>
              <TR>
                <TH>Employee</TH>
                <TH>Dept</TH>
                <TH>Present</TH>
                <TH>Late</TH>
                <TH>Half day</TH>
                <TH>Absent</TH>
                <TH>On leave</TH>
                <TH>Working days</TH>
                <TH>%</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={String(r.employeeId)} data-testid={`report-row-${r.employeeId}`}>
                  <TD>
                    {String(r.employeeId)} {String(r.fullName)}
                  </TD>
                  <TD>{String(r.department)}</TD>
                  <TD>{r.counts?.present}</TD>
                  <TD>{r.counts?.late}</TD>
                  <TD>{r.counts?.halfDay}</TD>
                  <TD>{r.counts?.absent}</TD>
                  <TD>{r.counts?.onLeave}</TD>
                  <TD>{String(r.workingDays)}</TD>
                  <TD>{String(r.percentage)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
