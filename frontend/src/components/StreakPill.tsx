import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function StreakPill() {
  const isAuthed = useAuth((s) => s.isAuthenticated());
  const { data } = useQuery({
    queryKey: ['me', 'stats'],
    queryFn: () => api.myStats(),
    enabled: isAuthed,
    staleTime: 30_000,
  });

  if (!data) return null;

  return (
    <span
      className="hidden sm:inline-flex items-center gap-2 text-xs"
      title={`Najdłuższa seria: ${data.longestStreakDays} dni · ${data.lessonsCompleted} lekcji ukończonych`}
    >
      <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full">
        🔥 {data.currentStreakDays} {data.currentStreakDays === 1 ? 'dzień' : 'dni'}
      </span>
      <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full">
        ✨ {data.totalXp.toLocaleString('pl-PL')} XP
      </span>
    </span>
  );
}
