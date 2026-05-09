import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

interface Props {
  courseId: string;
  isEnrolled: boolean;
}

export default function CourseReviews({ courseId, isEnrolled }: Props) {
  const auth = useAuth();
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const reviewsQ = useQuery({
    queryKey: ['course-reviews', courseId],
    queryFn: () => api.reviews.list(courseId),
  });
  const myReviewQ = useQuery({
    queryKey: ['course-review-mine', courseId],
    queryFn: () => api.reviews.mine(courseId),
    enabled: auth.isAuthenticated() && isEnrolled,
  });

  // Wczytaj swoją recenzję do formularza, jeśli istnieje.
  useEffect(() => {
    if (myReviewQ.data) {
      setRating(myReviewQ.data.rating);
      setComment(myReviewQ.data.comment ?? '');
    }
  }, [myReviewQ.data]);

  const upsert = useMutation({
    mutationFn: () =>
      api.reviews.upsert(courseId, { rating, comment: comment.trim() || null }),
    onSuccess: () => {
      toast.success('Recenzja zapisana.');
      qc.invalidateQueries({ queryKey: ['course-reviews', courseId] });
      qc.invalidateQueries({ queryKey: ['course-review-mine', courseId] });
      qc.invalidateQueries({ queryKey: ['course'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd zapisu.'),
  });

  const remove = useMutation({
    mutationFn: () => api.reviews.deleteMine(courseId),
    onSuccess: () => {
      setRating(0);
      setComment('');
      toast.success('Recenzja usunięta.');
      qc.invalidateQueries({ queryKey: ['course-reviews', courseId] });
      qc.invalidateQueries({ queryKey: ['course-review-mine', courseId] });
    },
  });

  const summary = reviewsQ.data?.summary;
  const reviews = reviewsQ.data?.reviews ?? [];

  return (
    <section className="mt-8 space-y-4">
      <header className="flex items-baseline gap-3">
        <h2 className="font-semibold">Opinie</h2>
        {summary && summary.count > 0 ? (
          <p className="text-sm text-gray-600">
            <RatingStars value={summary.average} /> · {summary.average.toFixed(1)} ({summary.count})
          </p>
        ) : (
          <p className="text-sm text-gray-500">Brak opinii — bądź pierwszy!</p>
        )}
      </header>

      {auth.isAuthenticated() && isEnrolled && (
        <form
          className="border rounded-lg bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!rating) {
              toast.error('Wybierz liczbę gwiazdek.');
              return;
            }
            setPending(true);
            upsert.mutate(undefined, { onSettled: () => setPending(false) });
          }}
        >
          <p className="text-sm font-medium mb-2">
            {myReviewQ.data ? 'Twoja recenzja' : 'Dodaj recenzję'}
          </p>
          <div className="flex items-center gap-1 mb-2" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                aria-label={`${n} gwiazdek`}
                className="text-2xl"
              >
                <span className={(hoverRating || rating) >= n ? 'text-amber-500' : 'text-gray-300'}>
                  ★
                </span>
              </button>
            ))}
          </div>
          <textarea
            className="w-full border rounded-md px-2 py-1 text-sm"
            rows={3}
            placeholder="Co Ci się podobało, co byś zmienił? (opcjonalnie)"
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={pending || !rating}
              className="px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50"
            >
              {pending ? 'Zapisuję…' : myReviewQ.data ? 'Zaktualizuj' : 'Dodaj recenzję'}
            </button>
            {myReviewQ.data && (
              <button
                type="button"
                onClick={() => remove.mutate()}
                className="px-3 py-1.5 border rounded-md text-sm text-red-700 hover:bg-red-50"
              >
                Usuń
              </button>
            )}
          </div>
        </form>
      )}

      {auth.isAuthenticated() && !isEnrolled && (
        <p className="text-xs text-gray-500">
          Zapisz się na kurs, żeby móc dodać recenzję.
        </p>
      )}

      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="border rounded-lg bg-white p-4">
            <div className="flex items-center gap-2 text-sm">
              {r.userAvatarUrl && (
                <img
                  src={r.userAvatarUrl}
                  alt=""
                  className="w-6 h-6 rounded-full"
                  loading="lazy"
                />
              )}
              <span className="font-medium">{r.userDisplayName}</span>
              <RatingStars value={r.rating} />
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(r.updatedAt).toLocaleDateString('pl-PL')}
              </span>
            </div>
            {r.comment && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RatingStars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span aria-label={`${value} z 5 gwiazdek`} className="text-amber-500" title={`${value.toFixed(1)} / 5`}>
      {'★'.repeat(rounded)}
      <span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - rounded))}</span>
    </span>
  );
}
