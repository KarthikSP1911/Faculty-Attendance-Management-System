'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/lib/auth';
import { ROLE_HOME, cn } from '@/lib/utils';

const LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How it works' },
  { id: 'roles', label: 'Roles' },
];

export function LandingNav() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    LINKS.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const cta = user ? (
    <Link href={ROLE_HOME[user.role]} data-testid="landing-dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
      Open dashboard
    </Link>
  ) : (
    <Link href="/login" data-testid="landing-login" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
      Log in
    </Link>
  );

  return (
    <header className={cn('frosted sticky top-0 z-30 border-b transition-shadow duration-200', scrolled ? 'elev-1 border-line' : 'border-transparent')}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" aria-label="FAMS home">
          <Logo />
        </Link>

        <nav aria-label="Sections" className="ml-6 hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              aria-current={active === l.id ? 'true' : undefined}
              className={cn(
                'relative rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-2 hover:text-fg',
                active === l.id ? 'text-primary' : 'text-muted',
              )}
            >
              {l.label}
              <span className={cn('absolute inset-x-3 -bottom-px h-0.5 origin-left rounded-full bg-primary transition-transform duration-200', active === l.id ? 'scale-x-100' : 'scale-x-0')} />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {cta}
          <button
            type="button"
            className="rounded-md p-2.5 hover:bg-surface-2 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="landing-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="landing-menu" aria-label="Sections" className="pop-in border-t border-line bg-surface px-4 py-2 md:hidden">
          {LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} onClick={() => setOpen(false)} className="block rounded-md px-3 py-3 text-sm font-medium hover:bg-surface-2">
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
