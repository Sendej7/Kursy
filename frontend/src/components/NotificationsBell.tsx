import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function NotificationsBell() {
  const auth = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const enabled = auth.isAuthenticated();

  // Polling unread count co 60s gdy zalogowany — taniej niż WebSocket dla MVP.
  const unread = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.notifications.unreadCount(),
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const list = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api.notifications.list(),
    enabled: enabled && open,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
    },
  });

  // Klik poza dropdownem zamyka.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!enabled) return null;

  const count = unread.data?.count ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Powiadomienia"
        className="relative p-1 hover:bg-gray-100 rounded"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <span className="text-sm font-semibold">Powiadomienia</span>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-gray-500 hover:underline"
              >
                Oznacz wszystkie
              </button>
            )}
          </div>
          {list.isLoading && <p className="p-3 text-sm text-gray-500">Ładowanie…</p>}
          {!list.isLoading && (list.data?.length ?? 0) === 0 && (
            <p className="p-4 text-sm text-gray-500">Brak powiadomień.</p>
          )}
          <ul className="divide-y">
            {list.data?.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    if (!n.readAt) markRead.mutate(n.id);
                    if (n.url) {
                      setOpen(false);
                      navigate(n.url);
                    }
                  }}
                  className={
                    'w-full text-left px-3 py-2 hover:bg-gray-50 flex flex-col gap-0.5 ' +
                    (n.readAt ? 'opacity-60' : '')
                  }
                >
                  <span className="text-sm font-medium leading-tight">{n.title}</span>
                  {n.body && <span className="text-xs text-gray-600 line-clamp-2">{n.body}</span>}
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(n.createdAt).toLocaleString('pl-PL')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
