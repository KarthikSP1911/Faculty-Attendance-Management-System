'use client';

import { CalendarCheck, CalendarClock, Clock3, Percent, UserCheck, UserX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardTitle, PageHeader, Stat } from '@/components/ui/card';
import { DemoNote, ErrorState, Skeleton } from '@/components/ui/feedback';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { FacultyDashboard } from '@/lib/types';
import { num } from '@/lib/utils';
import { CheckInCard } from './check-in-card';

export function FacultyDashboardView() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'faculty'],
    queryFn: () => api.get<FacultyDashboard>('/dashboard/faculty'),
  });

  return (
    <>
      <PageHeader title={`Hello, ${user?.faculty?.fullName ?? 'there'}`} subtitle="Your attendance this month and leave balances." actions={<DemoNote />} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <CheckInCard />
        <div className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : error || !data ? (
            <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
          ) : (
            <>
              <div className="grid animate-slide-up grid-cols-2 gap-3 sm:grid-cols-3" data-testid="month-stats">
                <Stat label="Attendance" icon={Percent} tone="brand" value={`${data.month.percentage}%`} hint="this month" data-testid="stat-percentage" />
                <Stat label="Working days" icon={CalendarCheck} tone="holiday" value={data.month.workingDays} data-testid="stat-working-days" />
                <Stat label="Present" icon={UserCheck} tone="present" value={data.month.counts?.present ?? 0} data-testid="stat-present" />
                <Stat label="Late" icon={Clock3} tone="late" value={data.month.counts?.late ?? 0} data-testid="stat-late" />
                <Stat label="Half day" icon={CalendarClock} tone="half" value={data.month.counts?.halfDay ?? 0} data-testid="stat-half-day" />
                <Stat label="Absent" icon={UserX} tone="absent" value={data.month.counts?.absent ?? 0} data-testid="stat-absent" />
              </div>
              <Card>
                <CardTitle>Leave balances</CardTitle>
                <ul className="grid gap-2 sm:grid-cols-2" data-testid="balances-list">
                  {data.balances.map((b) => (
                    <li key={b.leaveType.code} className="lift rounded-xl border border-line bg-surface-2 p-3 text-sm" data-testid={`balance-${b.leaveType.code.toLowerCase()}`}>
                      <p className="font-medium">{b.leaveType.name}</p>
                      <p className="text-muted tabular-nums">
                        {num(b.allotted) - num(b.used)} left of {num(b.allotted)}
                      </p>
                    </li>
                  ))}
                  {data.balances.length === 0 && <li className="text-sm text-muted">No balances yet.</li>}
                </ul>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
