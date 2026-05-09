import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import LessonImprovementPanel from '@/components/LessonImprovementPanel';

export default function Analytics() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['author', 'analytics', id],
    queryFn: () => api.author.analytics(id),
  });

  if (isLoading) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Ładowanie…</p>;
  if (error || !data) return <p className="max-w-3xl mx-auto px-4 py-10 text-red-600">Brak danych.</p>;

  return (
    <section className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Analityka kursu</h1>
      <p className="text-sm text-gray-600 mb-6">
        Zapisanych studentów: <strong>{data.enrolled}</strong>. Klikając „💡 Wygeneruj poprawioną wersję" AI przeanalizuje dane
        i zaproponuje konkretne zmiany w lekcji.
      </p>

      <ul className="space-y-4">
        {data.lessons.map((l) => {
          const completionPct = Math.round(l.completionRate * 100);
          const flag = completionPct < 50 ? '⚠️' : completionPct < 70 ? '🟡' : '🟢';
          const needsHelp =
            (data.enrolled > 0 && completionPct < 70) || l.avgAttempts > 3 || l.commonErrors.length > 0;

          return (
            <li key={l.lessonId} className="border rounded-lg bg-white p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">{l.title}</h2>
                <span className="text-xs text-gray-500">{l.totalAttempts} prób</span>
              </div>
              <div className="text-sm mt-1">
                <span className="mr-3">
                  {flag} ukończono: <strong>{completionPct}%</strong>
                </span>
                <span>średnio prób: {l.avgAttempts.toFixed(1)}</span>
              </div>

              {l.commonErrors.length > 0 && (
                <details className="mt-2" open>
                  <summary className="cursor-pointer text-xs font-medium">
                    Najczęstsze błędy ({l.commonErrors.length})
                  </summary>
                  <ul className="text-xs mt-1 space-y-1 pl-4">
                    {l.commonErrors.map((e, i) => (
                      <li key={i}>
                        <span className="text-gray-500">{e.occurrences}×</span> {e.description}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {l.commonQuestions.length > 0 && (
                <details className="mt-2" open>
                  <summary className="cursor-pointer text-xs font-medium">
                    Najczęstsze pytania do AI ({l.commonQuestions.length})
                  </summary>
                  <ul className="text-xs mt-1 space-y-1 pl-4">
                    {l.commonQuestions.map((q, i) => (
                      <li key={i}>
                        <span className="text-gray-500">{q.occurrences}×</span> „{q.question}"
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {needsHelp && <LessonImprovementPanel lessonId={l.lessonId} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
