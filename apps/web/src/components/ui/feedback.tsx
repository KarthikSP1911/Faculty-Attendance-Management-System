import type { ReactNode } from 'react';
import { Inbox, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-surface-2', className)} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-2" data-testid="loading-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action, testid = 'empty-state' }: { title: string; hint?: string; action?: ReactNode; testid?: string }) {
  return (
    <div data-testid={testid} className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line bg-surface-2/40 px-4 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden>
        <Inbox className="h-6 w-6" />
      </span>
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" data-testid="error-state" className="flex flex-col items-center gap-2 rounded-2xl border border-danger/40 px-4 py-8 text-center">
      <TriangleAlert className="h-7 w-7 text-danger" aria-hidden />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} data-testid="error-retry">
          Try again
        </Button>
      )}
    </div>
  );
}

export function DemoNote() {
  return (
    <p className="text-xs text-muted" data-testid="demo-note">
      Demo project. All names and records are synthetic.
    </p>
  );
}
