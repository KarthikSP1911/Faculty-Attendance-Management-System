'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BarChart3, CalendarCheck, CheckCircle2, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { LandingNav } from '@/components/landing-nav';
import { Reveal } from '@/components/reveal';

const FEATURES = [
  { icon: CalendarCheck, title: 'Server-time check-in', text: 'Check in and out with one tap. The server clock decides, never the device.' },
  { icon: ClipboardCheck, title: 'Leave and regularization', text: 'Apply, track and approve leave and missed punches with a clear audit trail.' },
  { icon: BarChart3, title: 'Reports', text: 'Daily, monthly, range and muster reports as CSV or PDF.' },
  { icon: ShieldCheck, title: 'Role based access', text: 'Faculty, head of department and administrator each see only what they need.' },
];

const STEPS = [
  { n: '1', title: 'Check in', text: 'Faculty mark attendance during the shift window. Late and half-day rules apply automatically.' },
  { n: '2', title: 'Request and approve', text: 'Leave and missed punches go to the head of department for a quick decision.' },
  { n: '3', title: 'Report', text: 'Admins track department attendance, defaulters and export reports.' },
];

const ROLES = [
  { role: 'Faculty', points: ['One-tap check-in and check-out', 'Leave balances and requests', 'Personal attendance calendar'] },
  { role: 'Head of department', points: ['Approve leave and regularization', 'Department attendance trend', 'Team status for today'] },
  { role: 'Administrator', points: ['Departments, faculty and shift rules', 'Holidays and audit log', 'Reports and CSV export'] },
];

const btnPrimary = 'inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover';
const btnSecondary = 'inline-flex h-11 items-center justify-center rounded-md border border-line bg-surface px-6 text-sm font-semibold transition-colors hover:bg-surface-2';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />

      <main id="main" tabIndex={-1} className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-primary/10 via-bg to-bg">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:px-8 lg:grid-cols-2 lg:py-20">
            <div className="animate-slide-up">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Attendance, leave and approvals
              </span>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">Faculty attendance, made simple.</h1>
              <p className="mt-5 max-w-xl text-lg text-muted">Check in, apply for leave, approve requests and report on attendance in one place.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" data-testid="landing-cta" className={btnPrimary}>
                  Get started <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/forgot-password" data-testid="landing-forgot" className={btnSecondary}>
                  Forgot password
                </Link>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
                {[
                  ['3', 'Roles'],
                  ['4', 'Report types'],
                  ['CSV, PDF', 'Export formats'],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="text-xs text-muted">{l}</dt>
                    <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="animate-slide-up [animation-delay:120ms] [animation-fill-mode:backwards]">
              <Image src="/hero-dashboard.svg" alt="Illustration of the FAMS dashboard with attendance cards, a chart and a check-in button" width={960} height={640} priority unoptimized className="h-auto w-full drop-shadow-xl" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 md:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Everything the department needs</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <li key={f.title}>
               <Reveal delay={i * 80}>
                <div className="lift rounded-lg border border-line bg-surface p-5 elev-1">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.text}</p>
                </div>
               </Reveal>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <ol className="mt-6 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.n} className="flex gap-4" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-fg">{s.n}</span>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 md:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Built for every role</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ROLES.map((r, i) => (
              <Reveal key={r.role} delay={i * 100}>
              <div className="lift h-full rounded-lg border border-line bg-surface p-5 elev-1">
                <h3 className="font-semibold">{r.role}</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {r.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-st-present" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="px-4 pb-14 md:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 rounded-lg bg-gradient-to-r from-[#0F6CBD] to-[#0B3A66] p-8 text-white md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Try it with the demo accounts</h2>
              <p className="mt-1 text-white/80">Log in as admin, head of department or faculty. All data is synthetic.</p>
            </div>
            <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-6 text-sm font-semibold text-[#0F6CBD] hover:bg-white/90">
              Log in <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted" data-testid="landing-footer">
        Demo project for software testing practice. All data is synthetic. Not an official service.
      </footer>
    </div>
  );
}
