'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle, PageHeader, Stat } from '@/components/ui/card';
import { DemoNote, EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api, errorMessage } from '@/lib/api';
import type { AdminDashboard } from '@/lib/types';

export function AdminDashboardView() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: () => api.get<AdminDashboard>('/dashboard/admin') });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  const k = data.kpis;

  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Institution overview. Percentages are month to date." actions={<DemoNote />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5" data-testid="admin-kpis">
        <Stat label="Faculty" value={k.totalFaculty} data-testid="kpi-total-faculty" />
        <Stat label="Departments" value={k.departments} data-testid="kpi-departments" />
        <Stat label="Present today" value={k.today.present} data-testid="kpi-present" />
        <Stat label="Late today" value={k.today.late} data-testid="kpi-late" />
        <Stat label="Half day today" value={k.today.halfDay} data-testid="kpi-half-day" />
        <Stat label="Absent today" value={k.today.absent} data-testid="kpi-absent" />
        <Stat label="On leave today" value={k.today.onLeave} data-testid="kpi-on-leave" />
        <Link href="/admin/approvals?tab=leave" data-testid="kpi-pending-leaves-link" className="rounded-2xl">
          <Stat label="Pending leave" value={k.pendingLeaves} data-testid="kpi-pending-leaves" />
        </Link>
        <Link href="/admin/approvals?tab=regularization" data-testid="kpi-pending-reg-link" className="rounded-2xl">
          <Stat label="Pending regularization" value={k.pendingRegularizations} data-testid="kpi-pending-regularizations" />
        </Link>
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
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.departmentComparison} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} />
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12 }} />
                    <Bar dataKey="percentage" name="Attendance" fill="rgb(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
