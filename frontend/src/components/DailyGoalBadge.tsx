import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/**
 * Badge w headerze: "X/Y dziś" gdy user ma cel dzienny > 0. Po osiągnięciu zielony ✓.
 * Polling co 60s; LessonsController.Complete też refetchuje przez query invalidation
 * (gdy wpięte) — tu fallback.
 */
export default function DailyGoalBadge() {
  const isAuthed = useAuth((s) => s.isAuthenticated());

  const data = useQuery({
    queryKey: ['daily-goal'],
    queryFn: () => api.dailyGoal.get(),
    enabled: isAuthed,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (!isAuthed || !data.data || data.data.goal === 0) return null;

  const { goal, doneToday, metToday } = data.data;

  return (
    <Link
      to="/account"
      className={
        'text-xs px-2 py-1 rounded-full ' +
        (metToday
          ? 'bg-green-100 text-green-800'
          : 'bg-amber-100 text-amber-800')
      }
      title={metToday ? 'Cel dzienny osiągnięty!' : `Pozostało ${goal - doneToday} lekcji do celu`}
    >
      🎯 {doneToday}/{goal}
      {metToday && ' ✓'}
    </Link>
  );
}
