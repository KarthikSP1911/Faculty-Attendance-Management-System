'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle, PageHeader, Stat } from '@/components/ui/card';
import { DemoNote, ErrorState, Skeleton } from '@/components/ui/feedback';
import { api, errorMessage } from '@/lib/api';
import type { HodDashboard } from '@/lib/types';
import { fmtDate } from '@/lib/utils';

export function HodDashboardView() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['dashboard', 'hod'], queryFn: () => api.get<HodDashboard>('/dashboard/hod') });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  const trend = data.trend.map((t) => ({ ...t, label: t.date.slice(5) }));
  const hasData = trend.some((t) => t.percentage !== null);

  return (
    <>
      <PageHeader title="Department dashboard" subtitle={`Today across ${data.headcount} faculty.`} actions={<DemoNote />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" data-testid="hod-today">
        <Stat label="Present" value={data.today.present} data-testid="hod-present" />
        <Stat label="Late" value={data.today.late} data-testid="hod-late" />
        <Stat label="Half day" value={data.today.halfDay} data-testid="hod-half-day" />
        <Stat label="Absent" value={data.today.absent} data-testid="hod-absent" />
        <Stat label="On leave" value={data.today.onLeave} data-testid="hod-on-leave" />
        <Stat label="Not marked" value={data.today.notMarked} data-testid="hod-not-marked" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardTitle>Pending approvals</CardTitle>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Leave requests</span>
              <Link href="/hod/approvals?tab=leave" className="font-semibold text-primary underline" data-testid="hod-pending-leave">
                {data.pendingApprovals.leave}
              </Link>
            </li>
            <li className="flex items-center justify-between">
              <span>Regularizations</span>
              <Link href="/hod/approvals?tab=regularization" className="font-semibold text-primary underline" data-testid="hod-pending-regularization">
                {data.pendingApprovals.regularization}
              </Link>
            </li>
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Attendance, last 30 days</CardTitle>
          {hasData ? (
            <figure aria-label="Line chart of department attendance percentage over the last 30 days" data-testid="hod-trend-chart">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} />
                    <Tooltip formatter={(v) => (typeof v === 'number' ? `${v}%` : 'No working day')} contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12 }} />
                    <Line type="monotone" dataKey="percentage" name="Attendance" stroke="rgb(var(--primary))" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <table className="sr-only">
                <caption>Attendance percentage by date</caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trend.map((t) => (
                    <tr key={t.date}>
                      <td>{fmtDate(t.date)}</td>
                      <td>{t.percentage ?? 'No working day'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </figure>
          ) : (
            <p className="text-sm text-muted" data-testid="hod-trend-empty">
              No attendance data for this period yet.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
