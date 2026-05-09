import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { api, type LessonImprovement } from '@/lib/api';

interface Props {
  lessonId: string;
}

export default function LessonImprovementPanel({ lessonId }: Props) {
  const [data, setData] = useState<LessonImprovement | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [view, setView] = useState<'preview' | 'theory' | 'starter' | 'tests'>('preview');

  async function generate() {
    setPending(true);
    setError(null);
    setApplied(false);
    try {
      const res = await api.author.proposeImprovement(lessonId);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  async function apply() {
    if (!data?.rewrittenLesson) return;
    setPending(true);
    try {
      await api.author.applyImprovement(lessonId, {
        contentMarkdown: data.rewrittenLesson.theory,
        starterCode: data.rewrittenLesson.starterCode,
        solutionCode: data.rewrittenLesson.solutionCode,
        testsCode: data.rewrittenLesson.testsCode,
        hints: data.rewrittenLesson.hints,
      });
      setApplied(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-t mt-3 pt-3">
      {!data && (
        <button
          className="text-xs px-2 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
          onClick={generate}
          disabled={pending}
        >
          {pending ? 'AI analizuje…' : '💡 Wygeneruj poprawioną wersję (AI)'}
        </button>
      )}
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

      {data && (
        <div className="space-y-3 mt-2">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <h4 className="text-xs font-semibold uppercase text-amber-800">Diagnoza AI</h4>
            <p className="text-sm mt-1 whitespace-pre-wrap">{data.diagnosis}</p>
            {data.suggestions.length > 0 && (
              <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
                {data.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </div>

          {data.rewrittenLesson && (
            <div className="border rounded-md bg-white">
              <div className="px-3 py-2 border-b flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-semibold">{data.rewrittenLesson.title}</span>
                <div className="flex gap-1 text-xs">
                  <button
                    className={`px-2 py-1 rounded ${view === 'preview' ? 'bg-black text-white' : 'border'}`}
                    onClick={() => setView('preview')}
                  >
                    Podgląd
                  </button>
                  <button
                    className={`px-2 py-1 rounded ${view === 'theory' ? 'bg-black text-white' : 'border'}`}
                    onClick={() => setView('theory')}
                  >
                    Teoria
                  </button>
                  <button
                    className={`px-2 py-1 rounded ${view === 'starter' ? 'bg-black text-white' : 'border'}`}
                    onClick={() => setView('starter')}
                  >
                    Starter
                  </button>
                  <button
                    className={`px-2 py-1 rounded ${view === 'tests' ? 'bg-black text-white' : 'border'}`}
                    onClick={() => setView('tests')}
                  >
                    Testy
                  </button>
                </div>
              </div>
              <div className="p-3 text-xs">
                {view === 'preview' && (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                      {data.rewrittenLesson.theory}
                    </ReactMarkdown>
                  </div>
                )}
                {view === 'theory' && (
                  <pre className="whitespace-pre-wrap font-mono">{data.rewrittenLesson.theory}</pre>
                )}
                {view === 'starter' && (
                  <pre className="whitespace-pre-wrap font-mono bg-gray-100 rounded p-2">
                    {data.rewrittenLesson.starterCode}
                  </pre>
                )}
                {view === 'tests' && (
                  <pre className="whitespace-pre-wrap font-mono bg-gray-100 rounded p-2">
                    {data.rewrittenLesson.testsCode}
                  </pre>
                )}
              </div>
              <div className="px-3 py-2 border-t flex gap-2 items-center">
                <button
                  className="px-3 py-1 bg-black text-white rounded-md text-xs disabled:opacity-50"
                  onClick={apply}
                  disabled={pending || applied}
                >
                  {applied ? '✓ Zastosowano' : pending ? 'Zapisuję…' : 'Zastosuj do lekcji'}
                </button>
                <button
                  className="px-3 py-1 border rounded-md text-xs hover:bg-gray-50"
                  onClick={() => setData(null)}
                >
                  Odrzuć
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
