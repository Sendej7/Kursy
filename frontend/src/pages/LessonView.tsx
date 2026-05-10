import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import CodeEditor from '@/components/CodeEditor';
import AiChat from '@/components/AiChat';
import LessonQAList from '@/components/LessonQAList';
import LessonNotes from '@/components/LessonNotes';
import { api } from '@/lib/api';
import { runPython, submitPython } from '@/lib/pyodide';
import { useAuth } from '@/lib/auth';
import { joinLesson, notifyCompleted } from '@/lib/lessonHub';
import { toast } from '@/lib/toast';

export default function LessonView() {
  const { lessonId = '' } = useParams();
  const isAuthed = useAuth((s) => s.isAuthenticated());
  const displayName = useAuth((s) => s.user?.displayName ?? 'Anonim');
  const qc = useQueryClient();
  const [presence, setPresence] = useState(0);
  const [recentCompletions, setRecentCompletions] = useState<string[]>([]);

  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.getLesson(lessonId),
    enabled: !!lessonId,
  });

  const { data: nav } = useQuery({
    queryKey: ['lesson', lessonId, 'nav'],
    queryFn: () => api.lessonNav(lessonId),
    enabled: !!lessonId,
  });

  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [tests, setTests] = useState<{ name: string; passed: boolean; message: string | null }[]>([]);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'submitting'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (lesson?.exercise?.starterCode) {
      setCode(lesson.exercise.starterCode);
    }
    setOutput('');
    setTests([]);
    setLastError(null);
    startedAt.current = Date.now();
  }, [lessonId, lesson?.exercise?.starterCode]);

  useEffect(() => {
    if (!lessonId || !isAuthed) return;
    let leaveFn: (() => Promise<void>) | null = null;
    joinLesson(
      lessonId,
      (p) => setPresence(p.count),
      (name) =>
        setRecentCompletions((prev) => {
          const next = [name, ...prev.filter((n) => n !== name)];
          return next.slice(0, 3);
        }),
    ).then((leave) => {
      leaveFn = leave;
    }).catch(() => {
      /* SignalR not available — no-op */
    });
    return () => {
      void leaveFn?.();
    };
  }, [lessonId, isAuthed]);

  const allPassed = tests.length > 0 && tests.every((t) => t.passed);

  async function onRun() {
    setRunStatus('running');
    setOutput('Uruchamiam…');
    setTests([]);
    const res = await runPython(code);
    setOutput(res.error ? `${res.stdout}\n${res.error}` : res.stdout || '(brak outputu)');
    setLastError(res.error ?? null);
    setRunStatus('idle');
  }

  async function onSubmit() {
    if (!lesson?.exercise) return;
    setRunStatus('submitting');
    setOutput('Sprawdzam…');
    setTests([]);

    const res = await submitPython(code, lesson.exercise.testsCode);
    setOutput(
      res.error
        ? `${res.stdout}\n${res.error}`
        : res.stdout || (res.passed ? '✓ wszystkie testy przeszły' : '(brak outputu)'),
    );
    setTests(res.tests);
    setLastError(res.error ?? null);

    if (isAuthed) {
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      try {
        await api.recordSubmission({
          exerciseId: lesson.exercise.id,
          code,
          passed: res.passed,
          timeSpentSeconds: seconds,
          errorMessage: res.error ?? null,
          stdout: res.stdout,
        });
        if (res.passed) {
          const completion = await api.completeLesson(lesson.id, seconds);
          qc.invalidateQueries({ queryKey: ['lesson', lessonId] });
          qc.invalidateQueries({ queryKey: ['me', 'courses'] });
          qc.invalidateQueries({ queryKey: ['me', 'certificates'] });
          notifyCompleted(lesson.id, displayName);
          qc.invalidateQueries({ queryKey: ['me', 'stats'] });
          qc.invalidateQueries({ queryKey: ['leaderboard'] });
          if (completion.certificateIssued) {
            toast.success('🎓 Wystawiono certyfikat — sprawdź zakładkę „Certyfikaty"!');
          } else if (completion.streakBumped && completion.currentStreak >= 2) {
            toast.success(
              `Świetnie! +${completion.xpGained} XP · 🔥 seria ${completion.currentStreak} dni`,
            );
          } else if (completion.xpGained > 0) {
            toast.success(`Świetnie! +${completion.xpGained} XP`);
          } else {
            toast.success('Lekcja ukończona ponownie.');
          }
        }
      } catch {
        /* nie blokuj UI */
      }
    }
    setRunStatus('idle');
  }

  const lessonContext = useMemo(() => lesson?.contentMarkdown ?? '', [lesson]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          void onSubmit();
        } else {
          void onRun();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lesson?.exercise?.id, runStatus]);

  if (isLoading) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Ładowanie lekcji…</p>;
  if (error || !lesson) {
    return <p className="max-w-3xl mx-auto px-4 py-10 text-red-600">Nie znaleziono lekcji.</p>;
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-6 space-y-3">
      {nav && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 border-b pb-2">
          <Link to={`/courses/${nav.courseSlug}`} className="hover:underline">
            ← {nav.courseTitle}
          </Link>
          <span>
            Lekcja {nav.indexInCourse} / {nav.courseTotalLessons}
          </span>
          {(presence > 0 || recentCompletions.length > 0) && (
            <div className="flex items-center gap-2">
              {presence > 0 && (
                <span className="px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                  ● {presence} {presence === 1 ? 'student' : 'studentów'} teraz tutaj
                </span>
              )}
              {recentCompletions.map((name, i) => (
                <span key={`${name}-${i}`} className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-full">
                  🎉 {name} właśnie skończył
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{lesson.contentMarkdown}</ReactMarkdown>
        {lesson.exercise && (
          <>
            <h3>Zadanie</h3>
            <p>{lesson.exercise.prompt}</p>
            {lesson.exercise.hints.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">Podpowiedzi</summary>
                <ul>
                  {lesson.exercise.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>

      {lesson.exercise && (
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden bg-[#1e1e1e]">
            <CodeEditor value={code} onChange={setCode} language="python" height="280px" />
          </div>

          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50"
              onClick={onRun}
              disabled={runStatus !== 'idle'}
            >
              {runStatus === 'running' ? 'Uruchamiam…' : 'Uruchom'}
            </button>
            <button
              className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={onSubmit}
              disabled={runStatus !== 'idle'}
            >
              {runStatus === 'submitting' ? 'Sprawdzam…' : 'Sprawdź'}
            </button>
            {allPassed && <span className="text-green-700 text-sm self-center">✓ ukończona</span>}
            <span className="ml-auto self-center text-xs text-gray-400 hidden sm:inline">
              <kbd className="px-1 py-0.5 border rounded">Ctrl</kbd>+
              <kbd className="px-1 py-0.5 border rounded">Enter</kbd> uruchom ·
              <kbd className="ml-1 px-1 py-0.5 border rounded">Ctrl</kbd>+
              <kbd className="px-1 py-0.5 border rounded">Shift</kbd>+
              <kbd className="px-1 py-0.5 border rounded">Enter</kbd> sprawdź
            </span>
          </div>

          <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 min-h-[80px] whitespace-pre-wrap overflow-x-auto">
            {output}
          </pre>

          {tests.length > 0 && (
            <ul className="text-xs space-y-1">
              {tests.map((t) => (
                <li key={t.name} className={t.passed ? 'text-green-700' : 'text-red-600'}>
                  {t.passed ? '✓' : '✗'} {t.name} {t.message ? `— ${t.message}` : ''}
                </li>
              ))}
            </ul>
          )}

          <AiChat
            lessonId={lesson.id}
            lessonContext={lessonContext}
            studentCode={code}
            errorMessage={lastError ?? undefined}
          />
        </div>
      )}
      </div>

      {nav && (
        <div className="flex justify-between border-t pt-3">
          {nav.prevLessonId ? (
            <Link
              to={`/courses/${nav.courseSlug}/lessons/${nav.prevLessonId}`}
              className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
            >
              ← {nav.prevTitle}
            </Link>
          ) : <span />}
          {nav.nextLessonId ? (
            <Link
              to={`/courses/${nav.courseSlug}/lessons/${nav.nextLessonId}`}
              className="px-3 py-1.5 bg-black text-white rounded-md text-sm"
            >
              {nav.nextTitle} →
            </Link>
          ) : <span className="text-xs text-gray-500">Ostatnia lekcja w kursie</span>}
        </div>
      )}

      {isAuthed && <LessonNotes lessonId={lessonId} />}
      <LessonQAList lessonId={lessonId} canAsk={isAuthed} />
    </section>
  );
}
