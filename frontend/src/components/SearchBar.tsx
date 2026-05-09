import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounce 300ms — autocomplete jako-się-pisze.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const results = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: () => api.search(debouncedQ, 5),
    enabled: debouncedQ.length >= 2,
  });

  // Klik poza zamyka.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const total =
    (results.data?.courses.length ?? 0) +
    (results.data?.lessons.length ?? 0) +
    (results.data?.questions.length ?? 0);

  return (
    <div ref={ref} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length >= 2) {
            navigate(`/search?q=${encodeURIComponent(q.trim())}`);
            setOpen(false);
          }
        }}
      >
        <input
          type="search"
          placeholder="Szukaj kursów, lekcji, pytań…"
          className="w-48 md:w-64 px-2 py-1 border rounded-md text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => q.length >= 2 && setOpen(true)}
        />
      </form>

      {open && debouncedQ.length >= 2 && (
        <div className="absolute right-0 mt-1 w-80 max-h-96 overflow-y-auto bg-white border rounded-lg shadow-lg z-20">
          {results.isLoading && <p className="p-3 text-sm text-gray-500">Szukam…</p>}
          {!results.isLoading && total === 0 && (
            <p className="p-3 text-sm text-gray-500">Brak wyników dla „{debouncedQ}"</p>
          )}

          {(results.data?.courses.length ?? 0) > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-gray-500 bg-gray-50">
                Kursy
              </p>
              <ul>
                {results.data!.courses.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/courses/${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium">{c.title}</span>
                      <span className="block text-xs text-gray-500 line-clamp-1">{c.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(results.data?.lessons.length ?? 0) > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-gray-500 bg-gray-50">
                Lekcje
              </p>
              <ul>
                {results.data!.lessons.map((l) => (
                  <li key={l.id}>
                    <Link
                      to={`/courses/${l.courseSlug}/lessons/${l.id}`}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium">{l.title}</span>
                      <span className="block text-xs text-gray-500 line-clamp-1">{l.courseTitle}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(results.data?.questions.length ?? 0) > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-gray-500 bg-gray-50">
                Pytania
              </p>
              <ul>
                {results.data!.questions.map((qq) => (
                  <li key={qq.id}>
                    <Link
                      to={`/questions/${qq.id}`}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium">
                        {qq.isResolved && <span className="text-green-700 mr-1">✓</span>}
                        {qq.title}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {qq.answerCount} odpowiedzi
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {total > 0 && (
            <Link
              to={`/search?q=${encodeURIComponent(debouncedQ)}`}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs text-center text-gray-600 hover:bg-gray-50 border-t"
            >
              Pełne wyniki →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
