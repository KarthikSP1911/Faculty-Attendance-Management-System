import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-line bg-surface p-5 elev-1', className)} {...props} />;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 border-b border-line pb-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}

type Tone = 'brand' | 'present' | 'late' | 'half' | 'absent' | 'leave' | 'holiday';
const TONE: Record<Tone, string> = {
  brand: 'bg-primary/10 text-primary',
  present: 'bg-st-present/10 text-st-present',
  late: 'bg-st-late/10 text-st-late',
  half: 'bg-st-half/10 text-st-half',
  absent: 'bg-st-absent/10 text-st-absent',
  leave: 'bg-st-leave/10 text-st-leave',
  holiday: 'bg-st-holiday/10 text-st-holiday',
};

/** KPI tile. `icon` and `tone` are optional and purely visual. */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  'data-testid': testId,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  'data-testid'?: string;
}) {
  return (
    <Card data-testid={testId} className="flex items-start justify-between gap-2 p-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-normal text-muted">{label}</p>
        <p className="mt-1.5 font-display text-2xl font-bold leading-none tabular-nums">{value}</p>
        {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      </div>
      {Icon && (
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md', TONE[tone])} aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
      )}
    </Card>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
