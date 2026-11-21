import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Table({ className, caption, ...props }: HTMLAttributes<HTMLTableElement> & { caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...props}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {props.children}
      </table>
    </div>
  );
}

export const THead = (p: HTMLAttributes<HTMLTableSectionElement>) => <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted" {...p} />;
export const TBody = (p: HTMLAttributes<HTMLTableSectionElement>) => <tbody className="divide-y divide-line" {...p} />;
export const TR = (p: HTMLAttributes<HTMLTableRowElement>) => <tr className="bg-surface" {...p} />;
export const TH = ({ className, ...p }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th scope="col" className={cn('whitespace-nowrap px-3 py-2.5 font-medium', className)} {...p} />
);
export const TD = ({ className, ...p }: TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn('px-3 py-2.5 align-middle', className)} {...p} />;

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  testid = 'pagination',
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  testid?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Pagination" className="mt-3 flex items-center justify-between gap-2 text-sm">
      <p className="text-muted" data-testid={`${testid}-info`}>
        Page {page} of {pages} ({total} total)
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid={`${testid}-prev`} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} data-testid={`${testid}-next`} aria-label="Next page">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
