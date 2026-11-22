'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarClock, ClipboardCheck, Clock3, PlaneTakeoff, UserCheck, UserMinus, UserX, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Card, CardTitle, PageHeader, Stat } from '@/components/ui/card';
import { DemoNote, EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api, errorMessage } from '@/lib/api';
import type { AdminDashboard } from '@/lib/types';

const DeptBarChart = dynamic(() => import('./charts').then((m) => m.DeptBarChart), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });

export function AdminDashboardView() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: () => api.get<AdminDashboard>('/dashboard/admin') });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  const k = data.kpis;

  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Institution overview. Percentages are month to date." actions={<DemoNote />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5" data-testid="admin-kpis">
        <Stat label="Faculty" icon={Users} tone="brand" value={k.totalFaculty} data-testid="kpi-total-faculty" />
        <Stat label="Departments" icon={Building2} tone="holiday" value={k.departments} data-testid="kpi-departments" />
        <Stat label="Present today" icon={UserCheck} tone="present" value={k.today.present} data-testid="kpi-present" />
        <Stat label="Late today" icon={Clock3} tone="late" value={k.today.late} data-testid="kpi-late" />
        <Stat label="Half day today" icon={CalendarClock} tone="half" value={k.today.halfDay} data-testid="kpi-half-day" />
        <Stat label="Absent today" icon={UserX} tone="absent" value={k.today.absent} data-testid="kpi-absent" />
        <Stat label="On leave today" icon={UserMinus} tone="leave" value={k.today.onLeave} data-testid="kpi-on-leave" />
        <div data-testid="kpi-pending-leaves-link">
          <Stat label="Pending leave" icon={PlaneTakeoff} tone="late" value={k.pendingLeaves} data-testid="kpi-pending-leaves" />
        </div>
        <div data-testid="kpi-pending-reg-link">
          <Stat label="Pending regularization" icon={ClipboardCheck} tone="half" value={k.pendingRegularizations} data-testid="kpi-pending-regularizations" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Department comparison (month to date)</CardTitle>
          {data.departmentComparison.length === 0 ? (
            <p className="text-sm text-muted" data-testid="dept-chart-empty">
              No department data yet.
            </p>
          ) : (
            <figure aria-label="Bar chart of attendance percentage by department" data-testid="dept-chart">
              <div className="h-64 w-full">
                <DeptBarChart data={data.departmentComparison} />
              </div>
              <table className="sr-only">
                <caption>Attendance percentage by department</caption>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departmentComparison.map((d) => (
                    <tr key={d.department}>
                      <td>{d.department}</td>
                      <td>{d.percentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </figure>
          )}
        </Card>

        <Card>
          <CardTitle>Defaulters (below {data.threshold}%)</CardTitle>
          {data.defaulters.length === 0 ? (
            <EmptyState title="No defaulters this month" testid="defaulters-empty" />
          ) : (
            <Table caption="Faculty below the attendance threshold" data-testid="defaulters-table">
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>Name</TH>
                  <TH>Dept</TH>
                  <TH>%</TH>
                </TR>
              </THead>
              <TBody>
                {data.defaulters.map((d) => (
                  <TR key={d.employeeId} data-testid={`defaulter-${d.employeeId}`}>
                    <TD>{d.employeeId}</TD>
                    <TD>{d.fullName}</TD>
                    <TD>{d.department}</TD>
                    <TD className="tabular-nums">{d.percentage}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
