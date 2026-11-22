'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Select } from '@/components/ui/form';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api, errorMessage } from '@/lib/api';
import type { Holiday } from '@/lib/types';
import { fmtDate, humanize, todayKey } from '@/lib/utils';

export const HOLIDAY_CLASS: Record<string, string> = {
  NATIONAL: 'bg-st-holiday/15 text-st-holiday',
  INSTITUTIONAL: 'bg-primary/10 text-primary',
  OPTIONAL: 'bg-st-off/15 text-st-off',
};

export function YearSelect({ year, onChange }: { year: number; onChange: (y: number) => void }) {
  const base = Number(todayKey().slice(0, 4));
  return (
    <Select className="h-9 w-28" value={year} onChange={(e) => onChange(Number(e.target.value))} aria-label="Year" data-testid="holiday-year">
      {[base - 1, base, base + 1].map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </Select>
  );
}

export function HolidaysView() {
  const [year, setYear] = useState(Number(todayKey().slice(0, 4)));
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['holidays', year], queryFn: () => api.get<Holiday[]>('/holidays', { year }) });

  return (
    <>
      <PageHeader title="Holidays" subtitle="Institution holiday calendar (demo data)." actions={<YearSelect year={year} onChange={setYear} />} />
      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data && data.length === 0 ? (
        <EmptyState title={`No holidays listed for ${year}`} testid="holidays-empty" />
      ) : (
        <Table caption="Holidays" data-testid="holidays-table" className="animate-slide-up">
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Name</TH>
              <TH>Type</TH>
            </TR>
          </THead>
          <TBody>
            {data?.map((h) => (
              <TR key={h.id} data-testid={`holiday-row-${h.date}`}>
                <TD className="whitespace-nowrap tabular-nums">{fmtDate(h.date)}</TD>
                <TD className="font-medium">{h.name}</TD>
                <TD>
                  <Badge className={HOLIDAY_CLASS[h.type]}>{humanize(h.type)}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
