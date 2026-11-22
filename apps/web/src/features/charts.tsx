'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tick = { fontSize: 11, fill: 'rgb(var(--muted))' };
const tip = { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 6 };

export function DeptBarChart({ data }: { data: { department: string; percentage: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
        <XAxis dataKey="department" tick={tick} />
        <YAxis domain={[0, 100]} unit="%" tick={tick} />
        <Tooltip formatter={(v) => `${v}%`} contentStyle={tip} />
        <Bar dataKey="percentage" name="Attendance" fill="rgb(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data }: { data: { label: string; percentage: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
        <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} unit="%" tick={tick} />
        <Tooltip formatter={(v) => (typeof v === 'number' ? `${v}%` : 'No working day')} contentStyle={tip} />
        <Line type="monotone" dataKey="percentage" name="Attendance" stroke="rgb(var(--primary))" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
