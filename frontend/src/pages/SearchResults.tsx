import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();

  const r = useQuery({
    queryKey: ['search', 'full', q],
    queryFn: () => api.search(q, 30),
    enabled: q.length >= 2,
  });

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">
        Wyniki wyszukiwania: <span className="text-gray-700">„{q}"</span>
      </h1>

      {q.length < 2 && <p className="text-gray-500">Wpisz co najmniej 2 znaki.</p>}
      {r.isLoading && <p className="text-gray-500">Szukam…</p>}

      {r.data && (
        <>
          <Section title={`Kursy (${r.data.courses.length})`}>
            {r.data.courses.length === 0 ? (
              <p className="text-sm text-gray-500">Brak.</p>
            ) : (
              <ul className="space-y-2">
                {r.data.courses.map((c) => (
                  <li key={c.id}>
                    <Link to={`/courses/${c.slug}`} className="block border rounded-lg bg-white p-3 hover:bg-gray-50">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{c.description}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Lekcje (${r.data.lessons.length})`}>
            {r.data.lessons.length === 0 ? (
              <p className="text-sm text-gray-500">Brak.</p>
            ) : (
              <ul className="space-y-2">
                {r.data.lessons.map((l) => (
                  <li key={l.id}>
                    <Link
                      to={`/courses/${l.courseSlug}/lessons/${l.id}`}
                      className="block border rounded-lg bg-white p-3 hover:bg-gray-50"
                    >
                      <p className="font-medium">{l.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">w kursie: {l.courseTitle}</p>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{l.snippet}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Pytania (${r.data.questions.length})`}>
            {r.data.questions.length === 0 ? (
              <p className="text-sm text-gray-500">Brak.</p>
            ) : (
              <ul className="space-y-2">
                {r.data.questions.map((qq) => (
                  <li key={qq.id}>
                    <Link to={`/questions/${qq.id}`} className="block border rounded-lg bg-white p-3 hover:bg-gray-50">
                      <p className="font-medium">
                        {qq.isResolved && <span className="text-green-700 mr-1">✓</span>}
                        {qq.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{qq.answerCount} odpowiedzi</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-2">{title}</h2>
      {children}
    </section>
  );
}
