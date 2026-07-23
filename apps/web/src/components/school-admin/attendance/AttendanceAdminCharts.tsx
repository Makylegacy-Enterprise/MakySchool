'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AttendanceAdminOverview } from '@makyschool/shared';

const STATUS_COLORS = {
  present: '#10b981',
  late: '#f59e0b',
  absent: '#f43f5e',
};

export function AttendanceAdminCharts({ data }: { data: AttendanceAdminOverview }) {
  const pieData = useMemo(
    () => [
      { name: 'Present', value: data.statusBreakdown.present, color: STATUS_COLORS.present },
      { name: 'Late', value: data.statusBreakdown.late, color: STATUS_COLORS.late },
      { name: 'Absent', value: data.statusBreakdown.absent, color: STATUS_COLORS.absent },
    ].filter((d) => d.value > 0),
    [data.statusBreakdown],
  );

  const complianceData = useMemo(
    () => [
      {
        name: 'Submitted',
        value: data.registerCompliance.submitted,
        color: STATUS_COLORS.present,
      },
      {
        name: 'Missing',
        value: data.registerCompliance.missing,
        color: STATUS_COLORS.absent,
      },
    ].filter((d) => d.value > 0),
    [data.registerCompliance],
  );

  const classBars = useMemo(
    () =>
      data.perClass.map((c) => ({
        name: c.className,
        rate: c.attendanceRate,
        submitted: c.registersSubmitted,
        missing: c.registersMissing,
      })),
    [data.perClass],
  );

  const trend = data.dailyTrend;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Daily attendance rate" subtitle="Trend over the selected range">
          {trend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Attendance rate']}
                  labelFormatter={(label) => String(label)}
                />
                <Line
                  type="monotone"
                  dataKey="attendanceRate"
                  stroke="var(--color-primary, #4f46e5)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Status breakdown" subtitle="All marks in range">
          {pieData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Register compliance"
          subtitle={`${data.registerCompliance.complianceRate}% of expected registers submitted`}
        >
          {complianceData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={complianceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {complianceData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Attendance by class" subtitle="Average rate per class stream">
          {classBars.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={classBars} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Attendance rate']} />
                <Bar dataKey="rate" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {data.perClass.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Per-class breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Present</th>
                  <th className="px-4 py-3">Late</th>
                  <th className="px-4 py-3">Absent</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Missing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.perClass.map((row) => (
                  <tr key={row.classId} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium text-foreground">{row.className}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.studentCount}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{row.attendanceRate}%</td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">{row.present}</td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{row.late}</td>
                    <td className="px-4 py-3 text-rose-600 dark:text-rose-400">{row.absent}</td>
                    <td className="px-4 py-3">{row.registersSubmitted}</td>
                    <td className="px-4 py-3">{row.registersMissing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      No attendance data in this range.
    </div>
  );
}

export function AttendanceAdminChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <div className="h-4 w-40 animate-pulse rounded bg-muted/70" />
          <div className="mt-2 h-3 w-56 animate-pulse rounded bg-muted/40" />
          <div className="mt-4 h-[260px] animate-pulse rounded-lg bg-muted/30" />
        </div>
      ))}
    </div>
  );
}
