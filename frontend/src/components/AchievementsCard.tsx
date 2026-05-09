import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AchievementsCard() {
  const list = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.achievements(),
  });

  if (list.isLoading) return <p className="text-sm text-gray-500">Ładowanie…</p>;
  const items = list.data ?? [];
  const earnedCount = items.filter((i) => i.earned).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Zdobyto {earnedCount} z {items.length} odznak.
      </p>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((a) => (
          <li
            key={a.type}
            title={a.earned ? `Zdobyto ${new Date(a.earnedAt!).toLocaleDateString('pl-PL')}` : 'Nie zdobyto'}
            className={
              'border rounded-lg p-3 flex items-center gap-2 ' +
              (a.earned ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200 opacity-60')
            }
          >
            <span className="text-2xl shrink-0">{a.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{a.name}</p>
              <p className="text-xs text-gray-600 line-clamp-2">{a.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
