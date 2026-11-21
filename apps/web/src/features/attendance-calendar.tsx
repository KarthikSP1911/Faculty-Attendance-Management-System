'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, PageHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api, errorMessage } from '@/lib/api';
import type { AttendanceRecord, AttendanceStatus, Holiday } from '@/lib/types';
import { STATUS_CLASS, STATUS_LABEL, cn, daysInMonth, firstWeekday, fmtDate, fmtMinutes, fmtTime, monthKey, shiftMonth, todayKey } from '@/lib/utils';
import { CheckInCard } from './check-in-card';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LEGEND: AttendanceStatus[] = ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF'];

export function AttendanceView() {
  const [month, setMonth] = useState(monthKey());
  const [y, m] = month.split('-').map(Number);

  const records = useQuery({ queryKey: ['attendance', 'me', month], queryFn: () => api.get<AttendanceRecord[]>('/attendance/me', { month }) });
  const holidays = useQuery({ queryKey: ['holidays', y, m], queryFn: () => api.get<Holiday[]>('/holidays', { year: y, month: m }) });

  const byDate = new Map((records.data ?? []).map((r) => [r.date, r]));
  const holidayByDate = new Map((holidays.data ?? []).map((h) => [h.date, h]));
  const today = todayKey();
  const total = daysInMonth(month);
  const lead = firstWeekday(month) - 1;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <>
      <PageHeader title="My attendance" subtitle="Check in or out, then review your month." />
      <div className="mb-5 max-w-xl">
        <CheckInCard />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" data-testid="calendar-prev">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <h2 className="font-semibold" data-testid="calendar-month" aria-live="polite">
            {label}
          </h2>
          <Button variant="secondary" size="sm" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" data-testid="calendar-next">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {records.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : records.error ? (
          <ErrorState message={errorMessage(records.error)} onRetry={() => records.refetch()} />
        ) : (
          <div role="grid" aria-label={`Attendance calendar for ${label}`} data-testid="calendar-grid" className="grid grid-cols-7 gap-1 text-center text-sm">
            {WEEK.map((d) => (
              <div key={d} role="columnheader" className="py-1 text-xs font-medium text-muted">
                {d}
              </div>
            ))}
            {cells.map((date, i) => {
              if (!date) return <div key={`b${i}`} role="gridcell" aria-hidden />;
              const rec = byDate.get(date);
              const hol = holidayByDate.get(date);
              const status: AttendanceStatus | null = rec?.status ?? (hol ? 'HOLIDAY' : null);
              const text = status ? STATUS_LABEL[status] : date > today ? 'Upcoming' : 'No record';
              return (
                <div
                  key={date}
                  role="gridcell"
                  tabIndex={0}
                  data-testid={`calendar-day-${date}`}
                  data-status={status ?? 'NONE'}
                  aria-label={`${fmtDate(date)}: ${hol ? `${hol.name}, ` : ''}${text}`}
                  title={hol ? hol.name : text}
                  className={cn('flex min-h-14 flex-col items-center justify-center rounded-xl border border-line p-1', status ? STATUS_CLASS[status] : 'bg-surface', date === today && 'ring-2 ring-primary')}
                >
                  <span className="font-semibold tabular-nums">{Number(date.slice(8))}</span>
                  <span className="hidden text-[10px] leading-tight sm:block">{status ? STATUS_LABEL[status] : ''}</span>
                </div>
              );
            })}
          </div>
        )}

        <ul className="mt-4 flex flex-wrap gap-2 text-xs" aria-label="Legend" data-testid="calendar-legend">
          {LEGEND.map((s) => (
            <li key={s} className={cn('rounded-full px-2.5 py-0.5 font-medium', STATUS_CLASS[s])}>
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Days without a record are left blank. Weekly offs appear once a record exists.</p>
      </Card>

      <h2 className="mb-2 mt-6 text-base font-semibold">Records for {label}</h2>
      {records.data && records.data.length === 0 ? (
        <EmptyState title="No attendance records this month" testid="attendance-empty" />
      ) : (
        <Table caption="Attendance records" data-testid="attendance-table">
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Status</TH>
              <TH>In</TH>
              <TH>Out</TH>
              <TH>Worked</TH>
            </TR>
          </THead>
          <TBody>
            {(records.data ?? []).map((r) => (
              <TR key={r.id} data-testid={`attendance-row-${r.date}`}>
                <TD>{fmtDate(r.date)}</TD>
                <TD>
                  <StatusBadge status={r.status} />
                  {r.regularized && <span className="ml-2 text-xs text-muted">regularized</span>}
                </TD>
                <TD>{fmtTime(r.checkInAt)}</TD>
                <TD>{fmtTime(r.checkOutAt)}</TD>
                <TD>{fmtMinutes(r.workedMinutes)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
