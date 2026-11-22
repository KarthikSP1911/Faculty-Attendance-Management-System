import Link from 'next/link';
import { Logo } from './logo';
import type { ReactNode } from 'react';
import { CalendarCheck, ShieldCheck, BarChart3 } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

const HIGHLIGHTS = [
  { icon: CalendarCheck, title: 'Attendance and leave in one place', text: 'Check in, apply for leave and request regularization in a few taps.' },
  { icon: ShieldCheck, title: 'Role-based and auditable', text: 'Faculty, HOD and admin views with a full audit trail.' },
  { icon: BarChart3, title: 'Clear reporting', text: 'Department comparison, defaulters and CSV exports.' },
];

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0F6CBD] via-[#115EA3] to-[#0B3A66] p-10 text-white lg:flex" aria-hidden>
        <div className="flex items-center gap-3">
          <Logo light />
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Attendance that runs itself, so faculty can focus on teaching.</h2>
          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/15">
                  <h.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{h.title}</p>
                  <p className="text-sm text-white/80">{h.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/70">Demo project. All data is synthetic. Not an official service.</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="frosted flex h-14 items-center justify-between border-b border-line px-4 md:px-8 lg:border-0 lg:bg-transparent">
          <Link href="/" className="flex items-center gap-2.5 font-semibold" data-testid="brand-link">
            <Logo tagline={false} />
          </Link>
          <ThemeToggle />
        </header>
        <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6 rounded-lg border border-line bg-surface p-6 elev-2">{children}</div>
          <p className="mt-4 text-center text-xs text-muted lg:hidden">Demo project. All data is synthetic. Not an official service.</p>
        </main>
      </div>
    </div>
  );
}
