'use client';

import { CalendarClock, Clock3, HelpCircle, PlaneTakeoff, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Card, CardTitle, PageHeader, Stat } from '@/components/ui/card';
import { DemoNote, ErrorState, Skeleton } from '@/components/ui/feedback';
import { api, errorMessage } from '@/lib/api';
import type { HodDashboard } from '@/lib/types';
import { fmtDate } from '@/lib/utils';

const TrendLineChart = dynamic(() => import('./charts').then((m) => m.TrendLineChart), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });

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
        <Stat label="Present" icon={UserCheck} tone="present" value={data.today.present} data-testid="hod-present" />
        <Stat label="Late" icon={Clock3} tone="late" value={data.today.late} data-testid="hod-late" />
        <Stat label="Half day" icon={CalendarClock} tone="half" value={data.today.halfDay} data-testid="hod-half-day" />
        <Stat label="Absent" icon={UserX} tone="absent" value={data.today.absent} data-testid="hod-absent" />
        <Stat label="On leave" icon={PlaneTakeoff} tone="leave" value={data.today.onLeave} data-testid="hod-on-leave" />
        <Stat label="Not marked" icon={HelpCircle} tone="holiday" value={data.today.notMarked} data-testid="hod-not-marked" />
      </div>

      <div className="mt-5 grid animate-slide-up gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardTitle>Pending approvals</CardTitle>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
              <span>Leave requests</span>
              <Link href="/hod/approvals?tab=leave" className="font-semibold text-primary underline" data-testid="hod-pending-leave">
                {data.pendingApprovals.leave}
              </Link>
            </li>
            <li className="flex items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
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
                <TrendLineChart data={trend} />
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
