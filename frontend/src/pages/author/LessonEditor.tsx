import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CodeEditor from '@/components/CodeEditor';
import MarkdownEditor from '@/components/MarkdownEditor';
import { api, type LessonType } from '@/lib/api';
import { toast } from '@/lib/toast';

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

  useEffect(() => {
    if (!lesson) return;
    setTitle(lesson.title);
    setOrder(lesson.order);
    setType(lesson.type);
    setVideoUrl(lesson.videoUrl ?? '');
    // Jeśli lekcja ma draft, pokazujemy DRAFT do edycji (priorytet) — autor edytuje go
    // i może opublikować lub odrzucić; jeśli brak draftu, edytujemy live.
    setContent(lesson.draftContentMarkdown ?? lesson.contentMarkdown);
    if (lesson.exercise) {
      setPrompt(lesson.exercise.prompt);
      setStarterCode(lesson.exercise.starterCode);
      setTestsCode(lesson.exercise.testsCode);
      setHints(lesson.exercise.hints.join('\n'));
    }
  }, [lesson]);

  const editingDraft = !!lesson?.draftContentMarkdown;

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
      toast.success('Live wersja zaktualizowana.');
      qc.invalidateQueries({ queryKey: ['lesson', id] });
    },
  });

  const saveDraft = useMutation({
    mutationFn: () => api.author.saveLessonDraft(id, content),
    onSuccess: () => {
      toast.success('Draft zapisany. Studenci wciąż widzą live.');
      qc.invalidateQueries({ queryKey: ['lesson', id] });
    },
  });

  const publishDraft = useMutation({
    mutationFn: () => api.author.publishLessonDraft(id),
    onSuccess: () => {
      toast.success('Draft opublikowany — studenci widzą nową wersję.');
      qc.invalidateQueries({ queryKey: ['lesson', id] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd.'),
  });

  const discardDraft = useMutation({
    mutationFn: () => api.author.discardLessonDraft(id),
    onSuccess: () => {
      toast.success('Draft odrzucony.');
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
  });

  const generate = useMutation({
    mutationFn: () => api.author.generateLesson(genTopic, content || lesson?.title || '', 'Python'),
    onSuccess: (gen) => {
      setTitle(gen.title);
      setContent(gen.theory);
      setPrompt(gen.title);
      setStarterCode(gen.starterCode);
      setSolutionCode(gen.solutionCode);
      setTestsCode(gen.testsCode);
      setHints(gen.hints.join('\n'));
    },
  });

  if (!lesson) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Ładowanie…</p>;

  return (
    <section className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Edytuj lekcję</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm">Tytuł</span>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm">Kolejność</span>
            <input
              type="number"
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-sm">Typ</span>
            <select
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as LessonType)}
            >
              <option>Theory</option>
              <option>Exercise</option>
              <option>Quiz</option>
              <option>Video</option>
            </select>
          </label>
          {type === 'Video' && (
            <label className="block">
              <span className="text-sm">URL wideo (YouTube / Vimeo)</span>
              <input
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… lub https://vimeo.com/…"
              />
            </label>
          )}
          <label className="block">
            <span className="text-sm block mb-1">Treść (markdown)</span>
            <MarkdownEditor value={content} onChange={setContent} rows={14} />
          </label>
          <div className={'border rounded-md p-2 ' + (editingDraft ? 'bg-amber-50 border-amber-300' : 'bg-gray-50')}>
            <p className="text-xs font-semibold mb-2">
              {editingDraft
                ? '✏️ Edytujesz wersję roboczą. Studenci widzą nadal live.'
                : '🟢 Edytujesz wersję live (widoczna dla studentów natychmiast po zapisie).'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="px-3 py-1.5 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                onClick={() => saveDraft.mutate()}
                disabled={saveDraft.isPending}
                title="Zapisuje draft; live wersja bez zmian"
              >
                {saveDraft.isPending ? 'Zapisuję…' : '💾 Zapisz draft'}
              </button>
              {editingDraft && (
                <>
                  <button
                    className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                    onClick={() => publishDraft.mutate()}
                    disabled={publishDraft.isPending}
                    title="Kopiuje draft do live; studenci zobaczą nową wersję"
                  >
                    {publishDraft.isPending ? 'Publikuję…' : '🚀 Opublikuj draft'}
                  </button>
                  <button
                    className="px-3 py-1.5 border border-red-300 text-red-700 rounded-md text-sm hover:bg-red-50"
                    onClick={() => {
                      if (confirm('Odrzucić draft? Zmiany przepadną.')) discardDraft.mutate();
                    }}
                  >
                    🗑️ Odrzuć draft
                  </button>
                </>
              )}
              <button
                className="px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50 ml-auto"
                onClick={() => saveLesson.mutate()}
                disabled={saveLesson.isPending}
                title="Zapisuje title/order/type + nadpisuje live content"
              >
                {saveLesson.isPending ? 'Zapisuję…' : '💾 Zapisz lekcję (live)'}
              </button>
            </div>
          </div>

          <details className="mt-4 text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-black">
              Kod do osadzenia (iframe)
            </summary>
            <p className="mt-2 text-gray-500">
              Wklej na blogu / stronie WWW. Działa tylko dla lekcji w publicznych, darmowych
              kursach.
            </p>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-[11px] font-mono whitespace-pre-wrap break-all">
{`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/lessons/${id}" width="100%" height="600" frameborder="0"></iframe>`}
            </pre>
            <button
              type="button"
              onClick={() => {
                const code = `<iframe src="${window.location.origin}/embed/lessons/${id}" width="100%" height="600" frameborder="0"></iframe>`;
                navigator.clipboard?.writeText(code).catch(() => undefined);
              }}
              className="mt-2 px-2 py-1 border rounded text-xs hover:bg-gray-50"
            >
              Skopiuj
            </button>
          </details>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Zadanie</h3>
          <label className="block">
            <span className="text-xs">Polecenie</span>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <div>
            <span className="text-xs">Kod startowy</span>
            <div className="border rounded-lg overflow-hidden mt-1">
              <CodeEditor value={starterCode} onChange={setStarterCode} height="120px" />
            </div>
          </div>
          <div>
            <span className="text-xs">Rozwiązanie</span>
            <div className="border rounded-lg overflow-hidden mt-1">
              <CodeEditor value={solutionCode} onChange={setSolutionCode} height="120px" />
            </div>
          </div>
          <div>
            <span className="text-xs">Testy (Python, funkcje test_*)</span>
            <div className="border rounded-lg overflow-hidden mt-1">
              <CodeEditor value={testsCode} onChange={setTestsCode} height="120px" />
            </div>
          </div>
          <label className="block">
            <span className="text-xs">Podpowiedzi (jedna na linię)</span>
            <textarea
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono"
              rows={3}
              value={hints}
              onChange={(e) => setHints(e.target.value)}
            />
          </label>
          <button
            className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
            onClick={() => saveExercise.mutate()}
            disabled={saveExercise.isPending}
          >
            {saveExercise.isPending ? 'Zapisuję…' : 'Zapisz zadanie'}
          </button>
        </div>
      </div>

      <div className="border rounded-lg bg-white p-4">
        <h3 className="font-semibold text-sm">Wygeneruj treść AI</h3>
        <p className="text-xs text-gray-600 mt-1">
          Wpisz temat (np. „pętla while" albo „lista składana"). AI wypełni treść, kod startowy, rozwiązanie i testy.
          Zawsze sprawdź zanim zapiszesz.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2 text-sm"
            value={genTopic}
            onChange={(e) => setGenTopic(e.target.value)}
            placeholder="Temat lekcji"
          />
          <button
            className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => genTopic && generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? 'Generuję…' : 'Generuj'}
          </button>
        </div>
      </div>
    </section>
  );
}
