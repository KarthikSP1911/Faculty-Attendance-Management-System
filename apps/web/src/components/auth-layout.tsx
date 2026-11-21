import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="frosted flex h-14 items-center justify-between border-b border-line px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold" data-testid="brand-link">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm text-primary-fg">F</span>
          FAMS
        </Link>
        <ThemeToggle />
      </header>
      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-sm">{children}</div>
        <p className="mt-4 text-center text-xs text-muted">Demo project. All data is synthetic. Not an official service.</p>
      </main>
    </div>
  );
}
