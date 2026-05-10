import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Status = 'idle' | 'typing' | 'saving' | 'saved' | 'error';

/**
 * Prywatne notatki studenta do lekcji. Auto-save z 1.5s debounce; status w toolbarze.
 */
export default function LessonNotes({ lessonId }: { lessonId: string }) {
  const initial = useQuery({
    queryKey: ['lesson-note', lessonId],
    queryFn: () => api.getNote(lessonId),
    staleTime: Infinity, // raz załadowane, nie odświeżamy w trakcie pisania
  });

  const [content, setContent] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const lastSavedRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initial.data) {
      setContent(initial.data.content);
      lastSavedRef.current = initial.data.content;
      setStatus('idle');
    }
  }, [initial.data]);

  useEffect(() => {
    if (initial.isLoading) return;
    if (content === lastSavedRef.current) return;

    setStatus('typing');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await api.saveNote(lessonId, content);
        lastSavedRef.current = content;
        setStatus('saved');
        // Po 2s zniknij status "saved" wracając do idle.
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
      } catch {
        setStatus('error');
      }
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, lessonId, initial.isLoading]);

  return (
    <div className="mt-6 border rounded-lg bg-white">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
        <span className="font-semibold text-gray-700">📝 Twoje notatki</span>
        <span className="text-gray-400">
          {status === 'typing' && 'piszesz…'}
          {status === 'saving' && 'zapisuję…'}
          {status === 'saved' && '✓ zapisano'}
          {status === 'error' && '⚠️ błąd zapisu'}
        </span>
      </div>
      <textarea
        className="w-full px-3 py-2 text-sm focus:outline-none resize-y"
        rows={6}
        placeholder="Twoje notatki do tej lekcji (widoczne tylko dla Ciebie). Auto-save."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={20_000}
        disabled={initial.isLoading}
      />
    </div>
  );
}
