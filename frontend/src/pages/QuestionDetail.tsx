import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

export default function QuestionDetail() {
  const { id = '' } = useParams();
  const auth = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState('');

  const detail = useQuery({
    queryKey: ['question', id],
    queryFn: () => api.qa.get(id),
  });

  const answer = useMutation({
    mutationFn: () => api.qa.answer(id, reply.trim()),
    onSuccess: () => {
      setReply('');
      toast.success('Odpowiedź dodana.');
      qc.invalidateQueries({ queryKey: ['question', id] });
    },
  });

  const accept = useMutation({
    mutationFn: (answerId: string) => api.qa.accept(id, answerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['question', id] }),
  });

  const upvote = useMutation({
    mutationFn: (answerId: string) => api.qa.upvote(answerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['question', id] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd.'),
  });

  if (detail.isLoading) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Ładowanie…</p>;
  if (detail.error || !detail.data)
    return <p className="max-w-3xl mx-auto px-4 py-10 text-red-600">Nie znaleziono pytania.</p>;

  const q = detail.data;
  const isMyQuestion = auth.user?.id === q.authorId;

  return (
    <section className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link to={`/courses`} className="text-sm text-gray-500 hover:underline">
        ← Wszystkie kursy
      </Link>

      <article className="border rounded-lg bg-white p-5">
        <h1 className="text-xl font-bold">{q.title}</h1>
        <p className="text-xs text-gray-500 mt-1">
          {q.authorDisplayName} · {new Date(q.createdAt).toLocaleString('pl-PL')}
        </p>
        {q.body && <div className="mt-3 text-sm whitespace-pre-wrap">{q.body}</div>}
      </article>

      <div>
        <h2 className="font-semibold mb-2">
          Odpowiedzi ({q.answers.length}) {q.acceptedAnswerId && <span className="text-green-700 text-sm ml-2">✓ rozwiązane</span>}
        </h2>
        <ul className="space-y-3">
          {q.answers.map((a) => (
            <li
              key={a.id}
              className={
                'border rounded-lg bg-white p-4 flex gap-3 ' +
                (a.isAccepted ? 'border-green-500 ring-1 ring-green-500/40' : '')
              }
            >
              <div className="flex flex-col items-center text-sm">
                <button
                  onClick={() => upvote.mutate(a.id)}
                  disabled={!auth.isAuthenticated() || a.authorId === auth.user?.id}
                  className={
                    'text-lg leading-none hover:text-amber-500 disabled:opacity-50 disabled:hover:text-current ' +
                    (a.votedByMe ? 'text-amber-500' : 'text-gray-400')
                  }
                  aria-label="Polajkuj"
                  title={a.authorId === auth.user?.id ? 'Nie można polajkować swojego' : 'Polajkuj'}
                >
                  ▲
                </button>
                <span className="text-xs">{a.upvotes}</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">
                  {a.authorDisplayName} · {new Date(a.createdAt).toLocaleString('pl-PL')}
                  {a.isAccepted && <span className="text-green-700 ml-2">✓ zaakceptowana</span>}
                </p>
                <div className="mt-1 text-sm whitespace-pre-wrap">{a.body}</div>
                {isMyQuestion && (
                  <button
                    onClick={() => accept.mutate(a.id)}
                    className="mt-2 text-xs underline text-gray-600 hover:text-green-700"
                  >
                    {a.isAccepted ? 'Cofnij akceptację' : 'Zaakceptuj jako rozwiązanie'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {auth.isAuthenticated() ? (
          <form
            className="mt-4 border rounded-lg bg-white p-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim().length < 2) return;
              answer.mutate();
            }}
          >
            <textarea
              className="w-full border rounded-md px-2 py-1 text-sm"
              rows={4}
              placeholder="Twoja odpowiedź…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={8000}
            />
            <button
              type="submit"
              disabled={answer.isPending || reply.trim().length < 2}
              className="px-3 py-1 bg-black text-white rounded-md text-sm disabled:opacity-50"
            >
              {answer.isPending ? 'Wysyłam…' : 'Odpowiedz'}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            <Link to="/login" className="underline">
              Zaloguj się
            </Link>{' '}
            by odpowiedzieć.
          </p>
        )}
      </div>
    </section>
  );
}
