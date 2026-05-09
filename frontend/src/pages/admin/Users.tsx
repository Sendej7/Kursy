import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

type Role = 'Student' | 'Author' | 'Admin';

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
      toast.success('Rola zaktualizowana.');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd zmiany roli.'),
  });

  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Użytkownicy</h1>

      <input
        type="search"
        placeholder="Szukaj po email lub imieniu…"
        className="w-full border rounded-md px-3 py-2 text-sm mb-4"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {isLoading && <p className="text-gray-500">Ładowanie…</p>}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b">
            <th className="py-2">Email</th>
            <th>Imię</th>
            <th>Rola</th>
            <th className="text-right">Kursy / Zapisy / Cert.</th>
            <th className="text-right">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.email}</td>
              <td>{u.displayName}</td>
              <td>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === 'Admin'
                      ? 'bg-red-50 text-red-700'
                      : u.role === 'Author'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {u.role}
                </span>
              </td>
              <td className="text-right text-xs text-gray-500">
                {u.authoredCourses} / {u.enrollments} / {u.certificates}
              </td>
              <td className="text-right">
                <select
                  className="text-xs border rounded px-1 py-0.5"
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
          ))}
        </tbody>
      </table>
    </section>
  );
}
