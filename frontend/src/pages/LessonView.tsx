import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MarkdownLesson from '@/components/MarkdownLesson';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Loader2,
  Users,
  PartyPopper,
} from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import AiChat from '@/components/AiChat';
import LessonQAList from '@/components/LessonQAList';
import LessonNotes from '@/components/LessonNotes';
import VideoEmbed from '@/components/VideoEmbed';
import LessonQuiz from '@/components/LessonQuiz';
import { api } from '@/lib/api';
import { runPython, submitPython } from '@/lib/pyodide';
import { runJs, submitJs } from '@/lib/jsRunner';
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
    }).catch(() => { /* SignalR not available */ });
    return () => {
      void leaveFn?.();
    };
  }, [lessonId, isAuthed]);

  const allPassed = tests.length > 0 && tests.every((t) => t.passed);
  const isJs = lesson?.courseLanguage === 'JavaScript' || lesson?.courseLanguage === 'TypeScript';
  const runFn = isJs ? runJs : runPython;
  const submitFn = isJs ? submitJs : submitPython;

  async function onRun() {
    setRunStatus('running');
    setOutput('Uruchamiam…');
    setTests([]);
    const res = await runFn(code);
    setOutput(res.error ? `${res.stdout}\n${res.error}` : res.stdout || '(brak outputu)');
    setLastError(res.error ?? null);
    setRunStatus('idle');
  }

  async function onSubmit() {
    if (!lesson?.exercise) return;
    setRunStatus('submitting');
    setOutput('Sprawdzam…');
    setTests([]);

    const res = await submitFn(code, lesson.exercise.testsCode);
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
            toast.success('🎓 Wystawiono certyfikat — sprawdź „Certyfikaty"!');
          } else if (completion.streakBumped && completion.currentStreak >= 2) {
            toast.success(`+${completion.xpGained} XP · 🔥 seria ${completion.currentStreak} dni`);
          } else if (completion.xpGained > 0) {
            toast.success(`+${completion.xpGained} XP`);
          } else {
            toast.success('Lekcja ukończona ponownie.');
          }
        }
      } catch { /* nie blokuj UI */ }
    }
    setRunStatus('idle');
  }

  const lessonContext = useMemo(() => lesson?.contentMarkdown ?? '', [lesson]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) void onSubmit();
        else void onRun();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lesson?.exercise?.id, runStatus]);

  if (isLoading) {
    return (
      <div className="container-page py-10 space-y-3">
        <div className="h-6 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-32 w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
      </div>
    );
  }
  if (error || !lesson) {
    return (
      <div className="container-narrow py-20 text-center">
        <p className="text-rose-600">Nie znaleziono lekcji.</p>
      </div>
    );
  }

  return (
    <section className="container-page py-6 space-y-5">
      {/* Top breadcrumb / presence */}
      {nav && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <Link
            to={`/courses/${nav.courseSlug}`}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-brand-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {nav.courseTitle}
          </Link>
          <div className="flex items-center gap-2">
            <span className="badge-neutral">
              Lekcja {nav.indexInCourse} / {nav.courseTotalLessons}
            </span>
            {presence > 0 && (
              <span className="badge-emerald">
                <Users className="w-3 h-3" />
                {presence} {presence === 1 ? 'student' : 'studentów'}
              </span>
            )}
            {recentCompletions.map((name, i) => (
              <span key={`${name}-${i}`} className="badge-amber animate-fade-in">
                <PartyPopper className="w-3 h-3" />
                {name} skończył
              </span>
            ))}
          </div>
        </div>
      )}

      <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{lesson.title}</h1>

      {lesson.type === 'Video' && lesson.videoUrl && (
        <div className="card overflow-hidden">
          <VideoEmbed url={lesson.videoUrl} />
        </div>
      )}

      {lesson.type === 'Quiz' && (
        <div className="card p-6">
          <LessonQuiz lessonId={lessonId} isCompleted={!!lesson.isCompleted} />
        </div>
      )}

      {lesson.type !== 'Quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: lesson content */}
          <article className="card p-6 prose prose-zinc dark:prose-invert max-w-none
                              prose-headings:font-semibold prose-headings:tracking-tight
                              prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline
                              prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-brand-700 prose-code:font-medium
                              prose-code:before:content-none prose-code:after:content-none
                              prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
                              dark:prose-code:bg-zinc-800 dark:prose-code:text-brand-300">
            <MarkdownLesson content={lesson.contentMarkdown} />
            {lesson.exercise && (
              <>
                <h3 className="!mt-6 flex items-center gap-2">
                  <span className="badge-brand !text-xs">Zadanie</span>
                </h3>
                <p>{lesson.exercise.prompt}</p>
                {lesson.exercise.hints.length > 0 && (
                  <details className="mt-3 not-prose">
                    <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:underline inline-flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4" />
                      Podpowiedzi ({lesson.exercise.hints.length})
                    </summary>
                    <ul className="mt-2 ml-5 list-disc text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                      {lesson.exercise.hints.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </details>
                )}
              </>
            )}
          </article>

          {/* RIGHT: code editor + AI chat */}
          {lesson.exercise && (
            <div className="space-y-3">
              <div className="card overflow-hidden bg-[#1e1e1e] border-zinc-700 dark:border-zinc-800">
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-900">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {isJs ? 'javascript' : 'python'}
                  </span>
                </div>
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={isJs ? 'javascript' : 'python'}
                  height="320px"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="btn-secondary"
                  onClick={onRun}
                  disabled={runStatus !== 'idle'}
                >
                  {runStatus === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {runStatus === 'running' ? 'Uruchamiam…' : 'Uruchom'}
                </button>
                <button
                  className="btn-brand"
                  onClick={onSubmit}
                  disabled={runStatus !== 'idle'}
                >
                  {runStatus === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {runStatus === 'submitting' ? 'Sprawdzam…' : 'Sprawdź'}
                </button>
                {allPassed && (
                  <span className="badge-emerald">
                    <CheckCircle2 className="w-3 h-3" />
                    Ukończona
                  </span>
                )}
                <span className="ml-auto text-[10px] text-zinc-400 hidden md:flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded font-mono">⌘↵</kbd>
                  uruchom ·
                  <kbd className="px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded font-mono">⌘⇧↵</kbd>
                  sprawdź
                </span>
              </div>

              <pre className="bg-zinc-950 text-zinc-100 text-xs font-mono rounded-xl p-4 min-h-[100px] whitespace-pre-wrap overflow-x-auto border border-zinc-800">
                {output || <span className="text-zinc-500">// output pojawi się tutaj</span>}
              </pre>

              {tests.length > 0 && (
                <div className="card p-3 space-y-1">
                  {tests.map((t) => (
                    <div key={t.name} className="flex items-start gap-2 text-sm">
                      {t.passed
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        : <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{t.name}</span>
                        {t.message && (
                          <p className="text-xs text-zinc-500 mt-0.5">{t.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
      )}

      {/* Bottom navigation */}
      {nav && (
        <div className="flex justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          {nav.prevLessonId ? (
            <Link
              to={`/courses/${nav.courseSlug}/lessons/${nav.prevLessonId}`}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{nav.prevTitle}</span>
              <span className="sm:hidden">Poprzednia</span>
            </Link>
          ) : <span />}
          {nav.nextLessonId ? (
            <Link
              to={`/courses/${nav.courseSlug}/lessons/${nav.nextLessonId}`}
              className="btn-brand"
            >
              <span className="hidden sm:inline">{nav.nextTitle}</span>
              <span className="sm:hidden">Następna</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="badge-emerald self-center">
              <CheckCircle2 className="w-3 h-3" />
              Ostatnia lekcja
            </span>
          )}
        </div>
      )}

      {isAuthed && <LessonNotes lessonId={lessonId} />}
      <LessonQAList lessonId={lessonId} canAsk={isAuthed} />
    </section>
  );
}
