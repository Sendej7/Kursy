import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import CodeEditor from '@/components/CodeEditor';
import { api, type LessonType } from '@/lib/api';

export default function LessonEditor() {
  const { id = '' } = useParams();

  const { data: lesson } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => api.getLesson(id),
    enabled: !!id,
  });

  const [title, setTitle] = useState('');
  const [order, setOrder] = useState(1);
  const [type, setType] = useState<LessonType>('Exercise');
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
    setContent(lesson.contentMarkdown);
    if (lesson.exercise) {
      setPrompt(lesson.exercise.prompt);
      setStarterCode(lesson.exercise.starterCode);
      setTestsCode(lesson.exercise.testsCode);
      setHints(lesson.exercise.hints.join('\n'));
    }
  }, [lesson]);

  const saveLesson = useMutation({
    mutationFn: () =>
      api.author.updateLesson(id, {
        moduleId: lesson!.moduleId,
        title,
        order,
        type,
        contentMarkdown: content,
      }),
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
            </select>
          </label>
          <label className="block">
            <span className="text-sm">Treść (markdown)</span>
            <textarea
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono"
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <button
            className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
            onClick={() => saveLesson.mutate()}
            disabled={saveLesson.isPending}
          >
            {saveLesson.isPending ? 'Zapisuję…' : 'Zapisz lekcję'}
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Podgląd</h3>
          <div className="border rounded-lg bg-white p-4 prose prose-sm max-w-none min-h-[200px]">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{content}</ReactMarkdown>
          </div>

          <h3 className="font-semibold text-sm pt-3">Zadanie</h3>
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
