import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { api } from '@/lib/api';

/**
 * Minimal layout for &lt;iframe&gt; embeds — bez Header'a, footera, nawigacji.
 * Brand'owy banner na dole linkujący do Kursy.pl.
 */
export default function EmbedLesson() {
  const { id = '' } = useParams();

  const lesson = useQuery({
    queryKey: ['embed', 'lesson', id],
    queryFn: () => api.embed.getLesson(id),
  });

  if (lesson.isLoading) {
    return <div className="p-4 text-sm text-gray-500">Ładowanie…</div>;
  }
  if (lesson.error || !lesson.data) {
    return (
      <div className="p-4 text-sm text-red-600">
        Lekcja niedostępna.
      </div>
    );
  }

  const l = lesson.data;
  const fullUrl = `${window.location.origin}/courses/${l.courseSlug}/lessons/${l.id}`;

  return (
    <article className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 px-4 py-6 max-w-3xl w-full mx-auto">
        <p className="text-xs text-gray-500">
          {l.courseTitle} · {l.authorDisplayName}
        </p>
        <h1 className="text-xl font-bold mt-1 mb-4">{l.title}</h1>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{l.contentMarkdown}</ReactMarkdown>
        </div>
      </div>

      <footer className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-600 flex items-center justify-between">
        <span>
          Lekcja na <strong>Kursy.pl</strong>
        </span>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-black"
        >
          Otwórz pełną wersję (z edytorem kodu i AI mentorem) →
        </a>
      </footer>
    </article>
  );
}
