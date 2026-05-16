import { useQuery } from '@tanstack/react-query';
import { Trophy, Flame, Sparkles, Medal } from 'lucide-react';
import { api } from '@/lib/api';
import Seo from '@/components/Seo';

const MEDALS = ['from-amber-400 to-amber-600', 'from-zinc-300 to-zinc-500', 'from-orange-400 to-orange-700'];

export default function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.leaderboard(),
  });

  return (
    <section className="container-page py-10 lg:py-16">
      <Seo title="Ranking" description="Top uczestników Kursy.pl według zdobytych XP." />

      <div className="text-center mb-10">
        <span className="badge-amber mb-3">
          <Trophy className="w-3 h-3" />
          Top 10
        </span>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Ranking liderów</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto">
          Za każdą ukończoną lekcję dostajesz <strong>10 XP</strong>. Pokonaj ich!
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2 max-w-2xl mx-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      <ol className="space-y-2 max-w-2xl mx-auto">
        {data?.map((entry, i) => {
          const medal = MEDALS[i];
          return (
            <li
              key={`${entry.displayName}-${i}`}
              className={`card-hover p-4 flex items-center gap-4 ${
                i === 0 ? 'ring-2 ring-amber-300 dark:ring-amber-700' : ''
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                medal
                  ? `bg-gradient-to-br ${medal} text-white shadow-lift`
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-semibold'
              }`}>
                {medal ? <Medal className="w-6 h-6" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold tracking-tight truncate">{entry.displayName}</p>
                {i === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">👑 #1 lider</p>
                )}
              </div>
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1 text-brand-600 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  {entry.totalXp.toLocaleString('pl-PL')}
                </span>
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <Flame className="w-3.5 h-3.5" />
                  {entry.currentStreakDays}d
                </span>
              </div>
            </li>
          );
        })}
        {data && data.length === 0 && (
          <div className="card p-12 text-center">
            <Trophy className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">Pusto. Bądź pierwszy — ukończ lekcję!</p>
          </div>
        )}
      </ol>
    </section>
  );
}
