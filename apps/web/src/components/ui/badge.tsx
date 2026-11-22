import { cn, STATUS_CLASS, STATUS_LABEL, humanize } from '@/lib/utils';
import type { AttendanceStatus } from '@/lib/types';

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: AttendanceStatus | null | undefined }) {
  if (!status) return <Badge className="bg-surface-2 text-muted">Not marked</Badge>;
  return <Badge className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</Badge>;
}

const REQUEST_CLASS: Record<string, string> = {
  DRAFT: 'bg-surface-2 text-muted',
  PENDING: 'bg-st-late/15 text-st-late',
  APPROVED: 'bg-st-present/15 text-st-present',
  REJECTED: 'bg-st-absent/15 text-st-absent',
  CANCELLED: 'bg-st-off/15 text-st-off',
  ACTIVE: 'bg-st-present/15 text-st-present',
  INACTIVE: 'bg-st-off/15 text-st-off',
};

export function RequestBadge({ status }: { status: string }) {
  return <Badge className={REQUEST_CLASS[status] ?? 'bg-surface-2 text-muted'}>{humanize(status)}</Badge>;
}
