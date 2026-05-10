import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

const PRESETS = [0, 1, 2, 3, 5];

export default function DailyGoalSetting() {
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ['daily-goal'],
    queryFn: () => api.dailyGoal.get(),
  });
  const [goal, setGoal] = useState(0);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  useEffect(() => {
    if (data.data) {
      setGoal(data.data.goal);
      setReminderEnabled(data.data.reminderEnabled);
    }
  }, [data.data]);

  const save = useMutation({
    mutationFn: () => api.dailyGoal.set(goal, reminderEnabled),
    onSuccess: () => {
      toast.success(goal === 0 ? 'Cel dzienny wyłączony.' : `Cel: ${goal} lekcji dziennie.`);
      qc.invalidateQueries({ queryKey: ['daily-goal'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd.'),
  });

  const dirty = data.data && (goal !== data.data.goal || reminderEnabled !== data.data.reminderEnabled);

  if (data.isLoading) return <p className="text-sm text-gray-500">Ładowanie…</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Ustaw cel — ile lekcji chcesz przejść każdego dnia. Badge w headerze pokazuje progres.
      </p>

      {data.data && data.data.goal > 0 && (
        <p className="text-sm">
          Dziś: <strong>{data.data.doneToday}/{data.data.goal}</strong>
          {data.data.metToday && <span className="text-green-700 ml-2">✓ osiągnięty</span>}
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setGoal(n)}
            className={
              'px-3 py-1.5 rounded-md text-sm border ' +
              (goal === n ? 'bg-black text-white border-black' : 'hover:bg-gray-50')
            }
          >
            {n === 0 ? 'Wyłącz' : `${n} ${n === 1 ? 'lekcja' : n < 5 ? 'lekcje' : 'lekcji'}/dzień`}
          </button>
        ))}
      </div>

      {goal > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
          />
          <span>Wysyłaj email-przypomnienie wieczorem, jeśli nie spełniłem celu</span>
        </label>
      )}

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending || !dirty}
        className="px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50"
      >
        {save.isPending ? 'Zapisuję…' : 'Zapisz cel'}
      </button>
    </div>
  );
}
