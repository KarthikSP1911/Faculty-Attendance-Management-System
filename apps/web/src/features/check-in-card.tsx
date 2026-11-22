'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import type { TodayInfo } from '@/lib/types';
import { fmtDate, fmtMinutes, fmtTime } from '@/lib/utils';

/** Shows the server's clock (never the device clock) and the check-in / check-out actions. */
export function CheckInCard() {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState('');
  const { data, isLoading, error: loadError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => api.get<TodayInfo>('/attendance/today'),
    refetchInterval: 60_000,
  });

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!data) return;
    const offset = new Date(data.serverTime).getTime() - dataUpdatedAt;
    const tick = () => setNow(new Date(Date.now() + offset));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data, dataUpdatedAt]);

  const done = () => {
    qc.invalidateQueries({ queryKey: ['attendance'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const checkIn = useMutation({
    mutationFn: () => api.post('/attendance/check-in'),
    onSuccess: () => {
      setError('');
      toast.success('Checked in.');
      done();
    },
    onError: (e) => {
      setError(errorMessage(e));
      toast.error(errorMessage(e));
    },
  });
  const checkOut = useMutation({
    mutationFn: () => api.post('/attendance/check-out'),
    onSuccess: () => {
      setError('');
      toast.success('Checked out.');
      done();
    },
    onError: (e) => {
      setError(errorMessage(e));
      toast.error(errorMessage(e));
    },
  });

  if (isLoading) return <Skeleton className="h-52 w-full" />;
  if (loadError || !data) return <ErrorState message={errorMessage(loadError)} onRetry={() => refetch()} />;

  const rec = data.record;
  const blocked =
    data.dayType === 'HOLIDAY' ? `Holiday: ${data.holidayName ?? ''}` : data.dayType === 'WEEKLY_OFF' ? 'Weekly off' : data.onLeave === 'FULL' ? 'On approved leave' : '';

  return (
    <Card data-testid="checkin-card" className="animate-slide-up border-t-4 border-t-primary">
      <CardTitle action={<StatusBadge status={rec?.status ?? (data.dayType === 'WORKING' ? null : data.dayType)} />}>Today, {fmtDate(data.date)}</CardTitle>
      <div className="rounded-xl bg-primary/5 px-4 py-5 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Server time (IST)</p>
        <p className="font-display text-5xl font-bold tabular-nums tracking-tight text-primary sm:text-6xl" data-testid="server-time" aria-live="off">
          {now ? now.toLocaleTimeString('en-IN', { hour12: true, timeZone: 'Asia/Kolkata' }) : '--:--:--'}
        </p>
      </div>

      {blocked && (
        <p className="pop-in mt-3 rounded-xl bg-surface-2 p-3 text-sm text-muted" data-testid="checkin-blocked">
          {blocked}. Check-in is not available today.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <dt className="text-xs text-muted">Check-in</dt>
          <dd className="font-display text-base font-semibold tabular-nums" data-testid="checkin-time">
            {fmtTime(rec?.checkInAt)}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <dt className="text-xs text-muted">Check-out</dt>
          <dd className="font-display text-base font-semibold tabular-nums" data-testid="checkout-time">
            {fmtTime(rec?.checkOutAt)}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <dt className="text-xs text-muted">Worked</dt>
          <dd className="font-display text-base font-semibold tabular-nums" data-testid="worked-time">
            {fmtMinutes(rec?.workedMinutes)}
          </dd>
        </div>
      </dl>

      {error && (
        <p role="alert" data-testid="checkin-error" className="mt-3 rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 [&>button]:w-full">
        <Button onClick={() => checkIn.mutate()} loading={checkIn.isPending} disabled={!!blocked || !!rec?.checkInAt} data-testid="checkin-button" size="lg">
          <LogIn className="h-5 w-5" aria-hidden />
          Check in
        </Button>
        <Button
          variant="secondary"
          onClick={() => checkOut.mutate()}
          loading={checkOut.isPending}
          disabled={!!blocked || !rec?.checkInAt || !!rec?.checkOutAt}
          data-testid="checkout-button"
          size="lg"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          Check out
        </Button>
      </div>
    </Card>
  );
}
