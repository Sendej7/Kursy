import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { useNavigate } from 'react-router-dom';

export default function SessionsList() {
  const auth = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const list = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.sessions.list(),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.sessions.revoke(id),
    onSuccess: () => {
      toast.success('Sesja wylogowana.');
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd.'),
  });

  const revokeOthers = useMutation({
    mutationFn: () => api.sessions.revokeOthers(),
    onSuccess: () => {
      toast.success('Wszystkie sesje wylogowane — zaloguj się ponownie.');
      auth.clear();
      navigate('/login');
    },
  });

  if (list.isLoading) return <p className="text-sm text-gray-500">Ładowanie…</p>;

  const sessions = list.data ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Aktywne sesje (zalogowane przeglądarki / urządzenia). Możesz wylogować pojedynczą lub
        wszystkie poza bieżącą.
      </p>

      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="border rounded-md bg-white px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" title={s.userAgent ?? '(brak User-Agent)'}>
                {prettifyUA(s.userAgent)}
              </p>
              <p className="text-xs text-gray-500">
                Zalogowano: {new Date(s.createdAt).toLocaleString('pl-PL')} · ważne do{' '}
                {new Date(s.expiresAt).toLocaleDateString('pl-PL')}
              </p>
            </div>
            <button
              onClick={() => revoke.mutate(s.id)}
              disabled={revoke.isPending}
              className="text-xs text-red-700 hover:underline disabled:opacity-50"
            >
              Wyloguj
            </button>
          </li>
        ))}
      </ul>

      {sessions.length > 1 && (
        <button
          onClick={() => {
            if (confirm('Wylogować wszystkie sesje (w tym tę bieżącą)? Zaloguj się ponownie.')) {
              revokeOthers.mutate();
            }
          }}
          className="px-3 py-1.5 border rounded-md text-sm text-red-700 hover:bg-red-50"
        >
          Wyloguj wszystkie sesje
        </button>
      )}
    </div>
  );
}

function prettifyUA(ua: string | null): string {
  if (!ua) return '(brak User-Agent)';
  // Heurystyka skrótu — bez parsing biblioteki, na MVP wystarczy.
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return /Mobile/.test(ua) ? 'Chrome Mobile' : 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/curl/i.test(ua)) return 'curl';
  return ua.length > 80 ? ua.slice(0, 80) + '…' : ua;
}
