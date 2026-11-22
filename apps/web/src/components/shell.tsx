'use client';

import { Logo } from './logo';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Ellipsis,
  FilePenLine,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PartyPopper,
  PlaneTakeoff,
  ScrollText,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_HOME, cn } from '@/lib/utils';
import type { Role } from '@/lib/types';
import { ThemeToggle } from './theme-toggle';
import { Dialog } from './ui/dialog';
import { Skeleton } from './ui/feedback';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
}

const myWork = (base: string): NavItem[] => [
  { key: 'attendance', label: 'My attendance', href: `${base}/attendance`, icon: CalendarCheck, group: 'My work' },
  { key: 'leave', label: 'Leave', href: `${base}/leave`, icon: PlaneTakeoff, group: 'My work' },
  { key: 'regularization', label: 'Regularization', href: `${base}/regularization`, icon: FilePenLine, group: 'My work' },
];

const NAV: Record<Role, NavItem[]> = {
  FACULTY: [
    { key: 'dashboard', label: 'Dashboard', href: '/faculty/dashboard', icon: LayoutDashboard, group: 'Overview' },
    ...myWork('/faculty'),
    { key: 'holidays', label: 'Holidays', href: '/faculty/holidays', icon: PartyPopper, group: 'General' },
    { key: 'notifications', label: 'Notifications', href: '/faculty/notifications', icon: Bell, group: 'General' },
  ],
  HOD: [
    { key: 'dashboard', label: 'Dashboard', href: '/hod/dashboard', icon: LayoutDashboard, group: 'Overview' },
    { key: 'approvals', label: 'Approvals', href: '/hod/approvals', icon: ClipboardCheck, group: 'Manage' },
    { key: 'department', label: 'Department', href: '/hod/faculty', icon: Users, group: 'Manage' },
    ...myWork('/hod'),
    { key: 'holidays', label: 'Holidays', href: '/hod/holidays', icon: PartyPopper, group: 'General' },
    { key: 'notifications', label: 'Notifications', href: '/hod/notifications', icon: Bell, group: 'General' },
  ],
  ADMIN: [
    { key: 'dashboard', label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, group: 'Overview' },
    { key: 'departments', label: 'Departments', href: '/admin/departments', icon: Building2, group: 'Organisation' },
    { key: 'faculty', label: 'Faculty', href: '/admin/faculty', icon: Users, group: 'Organisation' },
    { key: 'rules', label: 'Shifts and rules', href: '/admin/rules', icon: Clock3, group: 'Organisation' },
    { key: 'holidays', label: 'Holidays', href: '/admin/holidays', icon: CalendarDays, group: 'Organisation' },
    { key: 'reports', label: 'Reports', href: '/admin/reports', icon: BarChart3, group: 'Insights' },
    { key: 'audit', label: 'Audit log', href: '/admin/audit', icon: ScrollText, group: 'Insights' },
    { key: 'notifications', label: 'Notifications', href: '/admin/notifications', icon: Bell, group: 'General' },
  ],
};

const ROLE_LABEL: Record<Role, string> = { FACULTY: 'Faculty', HOD: 'Head of department', ADMIN: 'Administrator' };

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia('(min-width: 768px)');
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia('(min-width: 768px)').matches,
    () => true,
  );
}

const initials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Redirects to login when signed out and to the user's own home when the role does not match. */
export function RoleGuard({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (role && user.role !== role) router.replace(ROLE_HOME[user.role]);
  }, [loading, user, role, router, pathname]);

  if (loading || !user || (role && user.role !== role)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6" data-testid="guard-loading" role="status" aria-label="Loading">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return <Shell>{children}</Shell>;
}

function UnreadBell({ role }: { role: Role }) {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ unread: number }>('/notifications', { unread: 'true', pageSize: 1 }),
    refetchInterval: 60_000,
  });
  const n = data?.unread ?? 0;
  return (
    <Link
      href={`${ROLE_HOME[role].split('/').slice(0, 2).join('/')}/notifications`}
      data-testid="bell-link"
      aria-label={n > 0 ? `Notifications, ${n} unread` : 'Notifications'}
      className="relative rounded-md p-2.5 hover:bg-surface-2"
    >
      <Bell className="h-5 w-5" aria-hidden />
      {n > 0 && (
        <span data-testid="bell-count" className="absolute right-1 top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-white">
          {n > 99 ? '99+' : n}
        </span>
      )}
    </Link>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const desktop = useIsDesktop();
  const [more, setMore] = useState(false);
  if (!user) return null;

  const items = NAV[user.role];
  const home = ROLE_HOME[user.role];
  const showBack = pathname !== home;
  const doLogout = async () => {
    await logout();
    router.replace('/login');
  };
  const back = () => (window.history.length > 1 ? router.back() : router.push(home));

  const linkClass = (active: boolean) =>
    cn(
      'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
      active
        ? 'bg-surface-2 font-semibold text-primary before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary before:animate-fade-in'
        : 'font-medium text-fg hover:bg-surface-2',
    );

  return (
    <div className="min-h-screen md:flex">
      {desktop && (
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-line bg-surface p-3" aria-label="Sidebar">
          <Link href={home} className="mb-6 flex items-center gap-2.5 px-2" data-testid="brand-link">
            <Logo />
          </Link>
          <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
            {items.map((it, i) => (
              <div key={it.key} className="contents">
                {it.group !== items[i - 1]?.group && (
                  <p className={cn('px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted', i > 0 && 'mt-4')}>{it.group}</p>
                )}
                <Link href={it.href} data-testid={`nav-${it.key}`} aria-current={isActive(pathname, it.href) ? 'page' : undefined} className={linkClass(isActive(pathname, it.href))}>
                  <it.icon className="h-[18px] w-[18px]" aria-hidden />
                  {it.label}
                </Link>
              </div>
            ))}
          </nav>
          <p className="mt-3 px-2 text-xs text-muted">Demo project. Synthetic data. Not an official service.</p>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="frosted sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line px-3 elev-1 md:px-6">
          {showBack && (
            <button type="button" onClick={back} data-testid="back-button" aria-label="Go back" className="rounded-md p-2.5 hover:bg-surface-2">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          )}
          {!desktop && <span className="text-base font-semibold">FAMS</span>}
          <div className="ml-auto flex items-center gap-1">
            <UnreadBell role={user.role} />
            <ThemeToggle />
            {desktop && (
              <>
                <div className="mx-2 flex items-center gap-2.5" data-testid="user-info">
                  <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-fg">
                    {initials(user.faculty?.fullName ?? user.email)}
                  </span>
                  <div className="text-left leading-tight">
                    <p className="text-sm font-semibold">{user.faculty?.fullName ?? user.email}</p>
                    <p className="text-xs text-muted">{ROLE_LABEL[user.role]}</p>
                  </div>
                </div>
                <Link href="/change-password" data-testid="nav-change-password" aria-label="Change password" className="rounded-md p-2.5 hover:bg-surface-2">
                  <KeyRound className="h-5 w-5" aria-hidden />
                </Link>
                <button type="button" onClick={doLogout} data-testid="logout-button" aria-label="Log out" className="rounded-md p-2.5 hover:bg-surface-2">
                  <LogOut className="h-5 w-5" aria-hidden />
                </button>
              </>
            )}
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10">
          <div key={pathname} className="animate-slide-up">{children}</div>
        </main>
      </div>

      {!desktop && (
        <>
          <nav aria-label="Main" className="frosted fixed inset-x-0 bottom-0 z-30 flex border-t border-line pb-[env(safe-area-inset-bottom)] elev-2">
            {items.slice(0, 4).map((it) => (
              <Link
                key={it.key}
                href={it.href}
                data-testid={`nav-${it.key}`}
                aria-current={isActive(pathname, it.href) ? 'page' : undefined}
                className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors active:bg-surface-2', isActive(pathname, it.href) ? 'font-semibold text-primary' : 'text-muted')}
              >
                <it.icon className="h-5 w-5" aria-hidden />
                {it.label.split(' ')[0]}
              </Link>
            ))}
            <button type="button" onClick={() => setMore(true)} data-testid="nav-more" className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted">
              <Ellipsis className="h-5 w-5" aria-hidden />
              More
            </button>
          </nav>
          <Dialog open={more} onClose={() => setMore(false)} title="More" testid="more-dialog">
            <div className="flex flex-col gap-1">
              <p className="mb-2 text-sm text-muted" data-testid="user-info">
                {user.faculty?.fullName ?? user.email} ({ROLE_LABEL[user.role]})
              </p>
              {items.slice(4).map((it) => (
                <Link key={it.key} href={it.href} onClick={() => setMore(false)} data-testid={`nav-${it.key}`} className={linkClass(isActive(pathname, it.href))}>
                  <it.icon className="h-5 w-5" aria-hidden />
                  {it.label}
                </Link>
              ))}
              <Link href="/change-password" onClick={() => setMore(false)} data-testid="nav-change-password" className={linkClass(false)}>
                <KeyRound className="h-5 w-5" aria-hidden />
                Change password
              </Link>
              <button type="button" onClick={doLogout} data-testid="logout-button" className={linkClass(false)}>
                <LogOut className="h-5 w-5" aria-hidden />
                Log out
              </button>
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
}
