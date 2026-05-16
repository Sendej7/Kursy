import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Eye,
  CheckCircle2,
  XCircle,
  Play,
  Loader2,
  Sparkles,
  Code as CodeIcon,
  FileText,
  HelpCircle,
  Video,
  BookOpen,
  Rocket,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import CodeEditor from '@/components/CodeEditor';
import MarkdownEditor from '@/components/MarkdownEditor';
import QuizAuthor from '@/components/QuizAuthor';
import { api, type LessonType } from '@/lib/api';
import { toast } from '@/lib/toast';
import { runJs, submitJs } from '@/lib/jsRunner';
import { runPython, submitPython } from '@/lib/pyodide';

const LESSON_TYPES: { value: LessonType; label: string; icon: typeof FileText; desc: string }[] = [
  { value: 'Theory',   label: 'Teoria',     icon: BookOpen,   desc: 'Treść markdown, bez kodu' },
  { value: 'Exercise', label: 'Ćwiczenie',  icon: CodeIcon,   desc: 'Kod startowy + testy weryfikujące' },
  { value: 'Quiz',     label: 'Quiz',       icon: HelpCircle, desc: 'Pytania zamknięte z punktacją' },
  { value: 'Video',    label: 'Wideo',      icon: Video,      desc: 'Embed YouTube / Vimeo' },
];

type TestResult = { name: string; passed: boolean; message: string | null };

export default function LessonEditor() {
  const { id = '' } = useParams();
  const qc = useQueryClient();

  const { data: lesson } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => api.getLesson(id),
    enabled: !!id,
  });

  const [title, setTitle] = useState('');
  const [order, setOrder] = useState(1);
  const [type, setType] = useState<LessonType>('Exercise');
  const [videoUrl, setVideoUrl] = useState('');
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [solutionCode, setSolutionCode] = useState('');
  const [testsCode, setTestsCode] = useState('');
  const [hints, setHints] = useState<string>('');
  const [genTopic, setGenTopic] = useState('');

  // Lokalny runner — autor weryfikuje swoje rozwiązanie zanim zapisze
  const [testStatus, setTestStatus] = useState<'idle' | 'running'>('idle');
  const [testOutput, setTestOutput] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testError, setTestError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!lesson) return;
    setTitle(lesson.title);
    setOrder(lesson.order);
    setType(lesson.type);
    setVideoUrl(lesson.videoUrl ?? '');
    setContent(lesson.draftContentMarkdown ?? lesson.contentMarkdown);
    if (lesson.exercise) {
      setPrompt(lesson.exercise.prompt);
      setStarterCode(lesson.exercise.starterCode);
      setTestsCode(lesson.exercise.testsCode);
      setHints(lesson.exercise.hints.join('\n'));
    }
  }, [lesson]);

  const editingDraft = !!lesson?.draftContentMarkdown;
  const courseLang = lesson?.courseLanguage;
  const isJs = courseLang === 'JavaScript' || courseLang === 'TypeScript';

  const saveLesson = useMutation({
    mutationFn: () =>
      api.author.updateLesson(id, {
        moduleId: lesson!.moduleId,
        title,
        order,
        type,
        contentMarkdown: content,
        videoUrl: videoUrl.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Lekcja zapisana');
      qc.invalidateQueries({ queryKey: ['lesson', id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Błąd zapisu'),
  });

  const saveDraft = useMutation({
    mutationFn: () => api.author.saveLessonDraft(id, content),
    onSuccess: () => {
      toast.success('Draft zapisany');
      qc.invalidateQueries({ queryKey: ['lesson', id] });
    },
  });

  const publishDraft = useMutation({
    mutationFn: () => api.author.publishLessonDraft(id),
    onSuccess: () => {
      toast.success('Draft opublikowany — uczniowie widzą nową wersję');
      qc.invalidateQueries({ queryKey: ['lesson', id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Błąd'),
  });

  const discardDraft = useMutation({
    mutationFn: () => api.author.discardLessonDraft(id),
    onSuccess: () => {
      toast.success('Draft odrzucony');
      qc.invalidateQueries({ queryKey: ['lesson', id] });
    },
  });

  const saveExercise = useMutation({
    mutationFn: () =>
      api.author.upsertExercise(id, {
        prompt,
        starterCode,
        solutionCode,
        testsCode,
        hints: hints.split('\n').map((h) => h.trim()).filter(Boolean),
      }),
    onSuccess: () => toast.success('Zadanie zapisane'),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Błąd'),
  });

  const generate = useMutation({
    mutationFn: () => api.author.generateLesson(genTopic, content || lesson?.title || '', courseLang ?? 'Python'),
    onSuccess: (gen) => {
      setTitle(gen.title);
      setContent(gen.theory);
      setPrompt(gen.title);
      setStarterCode(gen.starterCode);
      setSolutionCode(gen.solutionCode);
      setTestsCode(gen.testsCode);
      setHints(gen.hints.join('\n'));
      toast.success('Treść wygenerowana — sprawdź zanim zapiszesz');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Błąd AI'),
  });

  // ── TEST RUNNER ────────────────────────────────────────────────
  async function runStarterOnly() {
    if (!starterCode.trim()) {
      toast.error('Brak kodu startowego');
      return;
    }
    setTestStatus('running');
    setTestOutput('Uruchamiam…');
    setTestResults([]);
    setTestError(null);
    const runFn = isJs ? runJs : runPython;
    const res = await runFn(starterCode);
    setTestOutput(res.stdout || '(brak outputu)');
    setTestError(res.error ?? null);
    setTestStatus('idle');
  }

  async function testSolution() {
    if (!solutionCode.trim() || !testsCode.trim()) {
      toast.error('Potrzebujesz solutionCode + testsCode');
      return;
    }
    setTestStatus('running');
    setTestOutput('Sprawdzam rozwiązanie…');
    setTestResults([]);
    setTestError(null);

    const submitFn = isJs ? submitJs : submitPython;
    const res = await submitFn(solutionCode, testsCode);
    setTestOutput(res.stdout || (res.passed ? '✓ wszystkie testy przeszły' : '(brak outputu)'));
    setTestResults(res.tests ?? []);
    setTestError(res.error ?? null);
    setTestStatus('idle');

    if (res.passed) {
      toast.success(`Wszystkie ${res.tests?.length ?? 0} testy zaliczone ✓`);
    } else {
      const failed = (res.tests ?? []).filter(t => !t.passed).length;
      toast.error(`${failed} testów nie przeszło`);
    }
  }

  function copyEmbed() {
    const code = `<iframe src="${window.location.origin}/embed/lessons/${id}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!lesson) {
    return (
      <div className="container-page py-10">
        <div className="h-8 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <section className="container-page py-6 lg:py-10 space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/author"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Panel autora
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Edytor lekcji</h1>
          <div className="flex items-center gap-2">
            {editingDraft && (
              <span className="badge-amber">
                <FileText className="w-3 h-3" />
                Edycja draftu
              </span>
            )}
            <Link
              to={`/courses/${lesson.moduleId}`}
              className="btn-ghost text-sm"
              title="Podgląd ucznia"
            >
              <Eye className="w-4 h-4" />
              Podgląd
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Meta + Content ─────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold tracking-tight">Podstawowe dane</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tytuł</span>
                <input
                  className="input mt-1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Kolejność</span>
                <input
                  type="number"
                  className="input mt-1"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
              </label>
            </div>

            <div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">Typ lekcji</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LESSON_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all
                        ${active
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                    >
                      <Icon className={`w-4 h-4 mb-1 ${active ? 'text-brand-600' : 'text-zinc-500'}`} />
                      <p className={`text-xs font-semibold ${active ? 'text-brand-700 dark:text-brand-300' : ''}`}>{t.label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {type === 'Video' && (
              <label className="block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">URL wideo</span>
                <input
                  className="input mt-1"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=… lub https://vimeo.com/…"
                />
              </label>
            )}
          </div>

          {/* Content / Quiz editor */}
          <div className="card p-5">
            <h2 className="font-semibold tracking-tight mb-3">
              {type === 'Quiz' ? 'Pytania quizu' : 'Treść lekcji'}
            </h2>
            {type === 'Quiz' ? (
              <QuizAuthor value={content} onChange={setContent} />
            ) : (
              <MarkdownEditor value={content} onChange={setContent} rows={18} />
            )}
          </div>

          {/* Save actions */}
          <div className={`card p-4 ${editingDraft ? '!border-amber-300 bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
            <p className="text-xs font-medium mb-3 text-zinc-600 dark:text-zinc-400">
              {editingDraft
                ? '✏️ Edytujesz draft. Uczniowie widzą poprzednią wersję — opublikuj żeby zaktualizować.'
                : '🟢 Edytujesz wersję live — zmiany pojawią się u uczniów od razu po zapisie.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-secondary"
                onClick={() => saveDraft.mutate()}
                disabled={saveDraft.isPending}
                title="Zapisz draft (uczniowie nadal widzą live)"
              >
                {saveDraft.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Zapisz draft
              </button>
              {editingDraft && (
                <>
                  <button
                    className="btn-brand bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => publishDraft.mutate()}
                    disabled={publishDraft.isPending}
                  >
                    <Rocket className="w-4 h-4" />
                    Opublikuj draft
                  </button>
                  <button
                    className="btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    onClick={() => {
                      if (confirm('Odrzucić draft? Zmiany przepadną.')) discardDraft.mutate();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Odrzuć
                  </button>
                </>
              )}
              <button
                className="btn-brand ml-auto"
                onClick={() => saveLesson.mutate()}
                disabled={saveLesson.isPending}
                title="Nadpisuje live content od razu"
              >
                {saveLesson.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Zapisz LIVE
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Exercise editor + Test runner ────────────────── */}
        <aside className="space-y-5">
          {type === 'Exercise' ? (
            <>
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <CodeIcon className="w-4 h-4 text-brand-600" />
                  <h2 className="font-semibold tracking-tight">Ćwiczenie</h2>
                  <span className="badge-neutral ml-auto text-[10px]">{courseLang}</span>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Polecenie</span>
                  <input
                    className="input mt-1"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="np. Napisz funkcję sum(arr)…"
                  />
                </label>

                <div>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                    Kod startowy <span className="text-zinc-400">(uczeń to widzi)</span>
                  </span>
                  <div className="border border-zinc-700 rounded-lg overflow-hidden bg-[#1e1e1e]">
                    <CodeEditor
                      value={starterCode}
                      onChange={setStarterCode}
                      language={isJs ? 'javascript' : 'python'}
                      height="140px"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                    Rozwiązanie <span className="text-zinc-400">(referencja, uczeń NIE widzi)</span>
                  </span>
                  <div className="border border-zinc-700 rounded-lg overflow-hidden bg-[#1e1e1e]">
                    <CodeEditor
                      value={solutionCode}
                      onChange={setSolutionCode}
                      language={isJs ? 'javascript' : 'python'}
                      height="140px"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                    Testy <span className="text-zinc-400">({isJs ? 'JS, funkcje test_* + assertEqual' : 'Python, funkcje test_*'})</span>
                  </span>
                  <div className="border border-zinc-700 rounded-lg overflow-hidden bg-[#1e1e1e]">
                    <CodeEditor
                      value={testsCode}
                      onChange={setTestsCode}
                      language={isJs ? 'javascript' : 'python'}
                      height="160px"
                    />
                  </div>
                  <details className="mt-2 text-xs text-zinc-500">
                    <summary className="cursor-pointer hover:text-zinc-700">Format testów</summary>
                    <pre className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-[11px] font-mono whitespace-pre-wrap">
{isJs
? `function test_basic() {
    assertEqual(sum([1,2,3]), 6);
    assertEqual(sum([]), 0);
}
function test_negative() {
    assertEqual(sum([-1, -2]), -3);
}

// Helpers: assertEqual, assertContains, assertTrue
// __stdout__ — output ucznia z console.log`
: `def test_basic(stdout, locals_):
    assert "Hello" in stdout

def test_variable_exists(stdout, locals_):
    assert "imie" in locals_`}
                    </pre>
                  </details>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Podpowiedzi (jedna na linię)
                  </span>
                  <textarea
                    className="input mt-1 font-mono text-xs"
                    rows={3}
                    value={hints}
                    onChange={(e) => setHints(e.target.value)}
                    placeholder="Użyj pętli for&#10;Pamiętaj o return"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    className="btn-brand flex-1"
                    onClick={() => saveExercise.mutate()}
                    disabled={saveExercise.isPending}
                  >
                    {saveExercise.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Zapisz zadanie
                  </button>
                </div>
              </div>

              {/* TEST RUNNER PANEL */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-semibold tracking-tight">Testuj zanim zapiszesz</h2>
                </div>
                <p className="text-xs text-zinc-500 mb-3">
                  Uruchom testy na swoim <strong>rozwiązaniu</strong> — sprawdź czy testy są poprawnie napisane.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    className="btn-secondary text-sm"
                    onClick={runStarterOnly}
                    disabled={testStatus !== 'idle' || !starterCode.trim()}
                  >
                    {testStatus === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Uruchom kod startowy
                  </button>
                  <button
                    className="btn-brand text-sm bg-emerald-600 hover:bg-emerald-700"
                    onClick={testSolution}
                    disabled={testStatus !== 'idle' || !solutionCode.trim() || !testsCode.trim()}
                  >
                    {testStatus === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Testuj rozwiązanie
                  </button>
                </div>

                {testOutput && (
                  <pre className="mt-3 bg-zinc-950 text-zinc-100 text-xs font-mono rounded-lg p-3 max-h-32 overflow-auto whitespace-pre-wrap">
                    {testOutput}
                  </pre>
                )}
                {testError && (
                  <pre className="mt-2 bg-rose-950 text-rose-200 text-xs font-mono rounded-lg p-3 max-h-32 overflow-auto whitespace-pre-wrap">
                    {testError}
                  </pre>
                )}
                {testResults.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {testResults.map((t) => (
                      <li key={t.name} className="flex items-start gap-2">
                        {t.passed
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          : <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className={t.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                            {t.name}
                          </span>
                          {t.message && (
                            <p className="text-xs text-zinc-500 mt-0.5">{t.message}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="card p-5 text-sm text-zinc-500">
              Edycja ćwiczenia tylko dla lekcji typu <strong>Ćwiczenie</strong>.
            </div>
          )}

          {/* AI Generate */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h2 className="font-semibold tracking-tight text-sm">Wygeneruj AI</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Wpisz temat — AI wypełni treść, kod startowy, rozwiązanie i testy.
            </p>
            <div className="flex flex-col gap-2">
              <input
                className="input"
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                placeholder={'np. „pętla while"'}
              />
              <button
                className="btn-secondary"
                onClick={() => genTopic && generate.mutate()}
                disabled={!genTopic || generate.isPending}
              >
                {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generuj
              </button>
            </div>
          </div>

          {/* Embed code */}
          <div className="card p-5 text-xs">
            <details>
              <summary className="cursor-pointer text-zinc-700 dark:text-zinc-300 font-medium hover:text-brand-600">
                Kod do embedu (iframe)
              </summary>
              <p className="mt-2 text-zinc-500">
                Wklej na blogu / stronie. Działa tylko dla publicznych darmowych kursów.
              </p>
              <pre className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded font-mono whitespace-pre-wrap break-all text-[10px]">
                {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/lessons/${id}" width="100%" height="600" frameborder="0"></iframe>`}
              </pre>
              <button
                type="button"
                onClick={copyEmbed}
                className="mt-2 btn-ghost !p-1 !px-2 text-xs"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Skopiowano' : 'Skopiuj'}
              </button>
            </details>
          </div>
        </aside>
      </div>
    </section>
  );
}
