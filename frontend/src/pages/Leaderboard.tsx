import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.leaderboard(),
  });

  return (
    <section className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Top 10 — XP</h1>
      <p className="text-sm text-gray-600 mb-6">
        Liderzy Kursów — najwięcej zdobytych punktów. Za każdą ukończoną lekcję dostajesz <strong>10 XP</strong>.
      </p>

      {isLoading && <p className="text-gray-500">Ładowanie…</p>}

      <ol className="space-y-2">
        {data?.map((entry, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          return (
            <li key={`${entry.displayName}-${i}`} className="border rounded-lg bg-white p-3 flex items-center justify-between">
              <span className="flex items-center gap-3">
                <span className="text-lg w-8 text-center">{medal}</span>
                <span className="font-medium">{entry.displayName}</span>
              </span>
              <span className="flex gap-3 text-sm">
                <span className="text-blue-700">✨ {entry.totalXp.toLocaleString('pl-PL')} XP</span>
                <span className="text-amber-700">🔥 {entry.currentStreakDays}d</span>
              </span>
            </li>
          );
        })}
        {data && data.length === 0 && (
          <p className="text-gray-500 text-center py-8">Pusto. Bądź pierwszy — ukończ lekcję!</p>
        )}
      </ol>
    </section>
  );
}
