'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BarChart3, CalendarCheck, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/lib/auth';
import { ROLE_HOME } from '@/lib/utils';

const FEATURES = [
  { icon: CalendarCheck, title: 'Server-time check-in', text: 'Check in and out with one tap. The server clock decides, never the device.' },
  { icon: ClipboardCheck, title: 'Leave and regularization', text: 'Apply, track and approve leave and missed punches with a clear audit trail.' },
  { icon: BarChart3, title: 'Reports', text: 'Daily, monthly, range and muster reports as CSV or PDF.' },
  { icon: ShieldCheck, title: 'Role based access', text: 'Faculty, head of department and administrator each see only what they need.' },
];

export default function LandingPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="frosted sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line px-4 md:px-8">
        <span className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm text-primary-fg">F</span>
          FAMS
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link href={ROLE_HOME[user.role]} data-testid="landing-dashboard" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg">
              Open dashboard
            </Link>
          ) : (
            <Link href="/login" data-testid="landing-login" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg">
              Log in
            </Link>
          )}
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 md:py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Faculty attendance, made simple.</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">Check in, apply for leave, approve requests and report on attendance in one place.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" data-testid="landing-cta" className="rounded-xl bg-primary px-6 py-3 text-base font-medium text-primary-fg">
              Get started
            </Link>
            <Link href="/forgot-password" data-testid="landing-forgot" className="rounded-xl border border-line bg-surface px-6 py-3 text-base font-medium">
              Forgot password
            </Link>
          </div>
        </motion.div>

        <ul className="mt-16 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <f.icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-3 font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </motion.li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted" data-testid="landing-footer">
        Demo project for software testing practice. All data is synthetic. Not an official service.
      </footer>
    </div>
  );
}
