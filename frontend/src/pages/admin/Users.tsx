import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, PenTool, User as UserIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import Seo from '@/components/Seo';

type Role = 'Student' | 'Author' | 'Admin';

const ROLE_BADGE: Record<Role, string> = {
  Admin: 'badge bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:ring-rose-700/50',
  Author: 'badge-brand',
  Student: 'badge-neutral',
};

const ROLE_ICON = { Admin: Shield, Author: PenTool, Student: UserIcon };

export default function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', q],
    queryFn: () => api.admin.users(q.trim() || undefined),
  });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api.admin.setRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Rola zaktualizowana');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd'),
  });

  return (
    <section className="container-page py-10 lg:py-16">
      <Seo title="Użytkownicy — admin" />

      <div className="mb-6">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Użytkownicy</h1>
        <p className="text-zinc-500 mt-1">{data?.length ?? '...'} kont w systemie</p>
      </div>

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Szukaj po email lub imieniu…"
            className="input pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Użytkownik</th>
              <th className="px-4 py-3 font-medium">Rola</th>
              <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Kursy / Zapisy / Cert.</th>
              <th className="px-4 py-3 font-medium text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data?.map((u) => {
              const Icon = ROLE_ICON[u.role as Role];
              return (
                <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                        {(u.displayName ?? '?').slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.displayName}</p>
                        <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={ROLE_BADGE[u.role as Role]}>
                      <Icon className="w-3 h-3" />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500 hidden sm:table-cell font-mono">
                    {u.authoredCourses} / {u.enrollments} / {u.certificates}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      className="input !py-1 !text-xs !w-auto"
                      value={u.role}
                      onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as Role })}
                      disabled={setRole.isPending}
                    >
                      <option value="Student">Student</option>
                      <option value="Author">Author</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                </tr>
              );
            })}
            {data && data.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-zinc-500">
                  Brak userów pasujących do wyszukiwania.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
