import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

interface Props {
  lessonId: string;
  /** Czy bieżący user jest zapisany na kurs (z CourseDetail). Bez tego nie pokazujemy formularza. */
  canAsk: boolean;
}

export default function LessonQAList({ lessonId, canAsk }: Props) {
  const auth = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const list = useQuery({
    queryKey: ['lesson', lessonId, 'questions'],
    queryFn: () => api.qa.listForLesson(lessonId),
  });

  const create = useMutation({
    mutationFn: () => api.qa.createQuestion(lessonId, { title, body: body || null }),
    onSuccess: () => {
      toast.success('Pytanie wysłane.');
      setTitle('');
      setBody('');
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['lesson', lessonId, 'questions'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd.'),
  });

  return (
    <section className="mt-8">
      <header className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Pytania ({list.data?.length ?? 0})</h2>
        {auth.isAuthenticated() && canAsk && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-3 py-1 bg-black text-white rounded-md"
          >
            Zadaj pytanie
          </button>
        )}
      </header>

      {showForm && (
        <form
          className="border rounded-lg bg-white p-3 mb-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length < 5) {
              toast.error('Tytuł min 5 znaków.');
              return;
            }
            create.mutate();
          }}
        >
          <input
            className="w-full border rounded-md px-2 py-1 text-sm"
            placeholder={'O co chodzi? (np. „Dlaczego range(1, 6) daje 5 liczb?")'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={256}
          />
          <textarea
            className="w-full border rounded-md px-2 py-1 text-sm"
            rows={4}
            placeholder="Szczegóły (opcjonalnie) — co próbowałeś, jaki błąd dostajesz…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={8000}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={create.isPending || title.trim().length < 5}
              className="px-3 py-1 bg-black text-white rounded-md text-sm disabled:opacity-50"
            >
              {create.isPending ? 'Wysyłam…' : 'Wyślij pytanie'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1 text-sm text-gray-500"
            >
              Anuluj
            </button>
          </div>
        </form>
      )}

      {!auth.isAuthenticated() && (
        <p className="text-xs text-gray-500 mb-3">Zaloguj się, by zadać pytanie.</p>
      )}
      {auth.isAuthenticated() && !canAsk && (
        <p className="text-xs text-gray-500 mb-3">Zapisz się na kurs, by zadać pytanie.</p>
      )}

      {(list.data?.length ?? 0) === 0 && (
        <p className="text-sm text-gray-500">Brak pytań — bądź pierwszy!</p>
      )}

      <ul className="divide-y border rounded-lg bg-white">
        {list.data?.map((q) => (
          <li key={q.id}>
            <Link
              to={`/questions/${q.id}`}
              className="block px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
            >
              <span className="flex-1">
                <span className="text-sm font-medium">
                  {q.isResolved && <span className="text-green-700 mr-1">✓</span>}
                  {q.title}
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  {q.authorDisplayName} · {new Date(q.createdAt).toLocaleDateString('pl-PL')} ·{' '}
                  {q.answerCount} odpowiedzi
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
