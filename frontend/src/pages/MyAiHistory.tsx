import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function MyAiHistory() {
  const list = useQuery({
    queryKey: ['ai', 'history'],
    queryFn: () => api.aiHistory(50),
  });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Moje rozmowy z AI mentorem</h1>
      <p className="text-sm text-gray-600 mb-6">
        Ostatnie pytania zadane mentorowi w lekcjach. Klik wpis, by zobaczyć całą odpowiedź.
      </p>

      {list.isLoading && <p className="text-gray-500">Ładowanie…</p>}
      {!list.isLoading && (list.data?.length ?? 0) === 0 && (
        <p className="text-gray-500">
          Brak rozmów. Zadaj mentorowi pytanie podczas{' '}
          <Link to="/courses" className="underline">
            jakiejś lekcji
          </Link>
          .
        </p>
      )}

      <ul className="space-y-2">
        {list.data?.map((it) => {
          const open = openId === it.id;
          return (
            <li key={it.id} className="border rounded-lg bg-white">
              <button
                onClick={() => setOpenId(open ? null : it.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50"
              >
                <p className="text-sm font-medium line-clamp-2">{it.question}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {it.courseTitle && (
                    <>
                      {it.courseTitle}
                      {it.lessonTitle && ` · ${it.lessonTitle}`}
                      {' · '}
                    </>
                  )}
                  {new Date(it.createdAt).toLocaleString('pl-PL')}
                </p>
              </button>
              {open && (
                <div className="border-t px-4 py-3 text-sm whitespace-pre-wrap bg-gray-50 space-y-2">
                  <p className="font-semibold text-xs text-gray-500 uppercase">Pytanie</p>
                  <p>{it.question}</p>
                  <p className="font-semibold text-xs text-gray-500 uppercase mt-3">Odpowiedź</p>
                  <p>{it.answer}</p>
                  {it.lessonId && it.courseSlug && (
                    <Link
                      to={`/courses/${it.courseSlug}/lessons/${it.lessonId}`}
                      className="inline-block mt-2 text-xs underline"
                    >
                      Wróć do lekcji →
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
