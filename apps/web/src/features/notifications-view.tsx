'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import type { Notification, Page } from '@/lib/types';
import { cn, fmtDateTime } from '@/lib/utils';

export function NotificationsView() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', 'list', page, unreadOnly],
    queryFn: () => api.get<Page<Notification> & { unread: number }>('/notifications', { page, pageSize: 20, unread: unreadOnly ? 'true' : undefined }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const readOne = useMutation({ mutationFn: (id: string) => api.post(`/notifications/${id}/read`), onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      toast.success('All notifications marked as read.');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={data ? `${data.unread} unread` : undefined}
        actions={
          <>
            <Button variant="secondary" size="sm" aria-pressed={unreadOnly} onClick={() => { setUnreadOnly(!unreadOnly); setPage(1); }} data-testid="notifications-unread-toggle">
              {unreadOnly ? 'Show all' : 'Unread only'}
            </Button>
            <Button size="sm" onClick={() => readAll.mutate()} loading={readAll.isPending} disabled={!data?.unread} data-testid="notifications-read-all">
              Mark all read
            </Button>
          </>
        }
      />
      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data && data.items.length === 0 ? (
        <EmptyState title="No notifications" testid="notifications-empty" />
      ) : (
        <>
          <ul className="space-y-2" data-testid="notifications-list">
            {data?.items.map((n) => (
              <li key={n.id} data-testid={`notification-${n.id}`} className={cn('flex items-start gap-3 rounded-2xl border border-line p-4', n.readAt ? 'bg-surface' : 'bg-primary/5')}>
                <div className="flex-1">
                  <p className="font-medium">
                    {!n.readAt && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}
                    {n.title}
                  </p>
                  <p className="text-sm text-muted">{n.message}</p>
                  <p className="mt-1 text-xs text-muted">{fmtDateTime(n.createdAt)}</p>
                </div>
                {!n.readAt && (
                  <Button size="sm" variant="ghost" onClick={() => readOne.mutate(n.id)} data-testid={`notification-read-${n.id}`}>
                    Mark read
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {data && <Pagination page={page} pageSize={20} total={data.total} onPage={setPage} testid="notifications-pagination" />}
        </>
      )}
    </>
  );
}
