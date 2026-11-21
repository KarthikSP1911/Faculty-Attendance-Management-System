'use client';

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
      <div className="grid gap-4 lg:grid-cols-2">
        <CheckInCard />
        <div className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : error || !data ? (
            <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="month-stats">
                <Stat label="Attendance" value={`${data.month.percentage}%`} hint="this month" data-testid="stat-percentage" />
                <Stat label="Working days" value={data.month.workingDays} data-testid="stat-working-days" />
                <Stat label="Present" value={data.month.counts?.present ?? 0} data-testid="stat-present" />
                <Stat label="Late" value={data.month.counts?.late ?? 0} data-testid="stat-late" />
                <Stat label="Half day" value={data.month.counts?.halfDay ?? 0} data-testid="stat-half-day" />
                <Stat label="Absent" value={data.month.counts?.absent ?? 0} data-testid="stat-absent" />
              </div>
              <Card>
                <CardTitle>Leave balances</CardTitle>
                <ul className="grid gap-2 sm:grid-cols-2" data-testid="balances-list">
                  {data.balances.map((b) => (
                    <li key={b.id} className="rounded-xl bg-surface-2 p-3 text-sm" data-testid={`balance-${b.leaveType.code.toLowerCase()}`}>
                      <p className="font-medium">{b.leaveType.name}</p>
                      <p className="text-muted">
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
