import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import CodeEditor from '@/components/CodeEditor';
import AiChat from '@/components/AiChat';
import { runPython } from '@/lib/pyodide';

const SAMPLE_LESSON = `## Pętla for

Pętla \`for\` pozwala wykonać blok kodu wielokrotnie.

### Spróbuj sam
Napisz pętlę, która wypisze liczby od 1 do 5.
`;

const SAMPLE_STARTER = `# napisz tu kod
for i in range(...):
    print(i)
`;

export default function LessonView() {
  const [code, setCode] = useState(SAMPLE_STARTER);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setOutput('Uruchamiam…');
    const res = await runPython(code);
    setOutput(res.error ? `${res.stdout}\n${res.error}` : res.stdout || '(brak outputu)');
    setRunning(false);
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{SAMPLE_LESSON}</ReactMarkdown>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg overflow-hidden bg-[#1e1e1e]">
          <CodeEditor value={code} onChange={setCode} language="python" height="280px" />
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50"
            onClick={run}
            disabled={running}
          >
            {running ? 'Uruchamiam…' : 'Uruchom'}
          </button>
          <button
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
            disabled={running}
          >
            Sprawdź
          </button>
        </div>

        <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 min-h-[80px] whitespace-pre-wrap">
          {output}
        </pre>

        <AiChat lessonContext={SAMPLE_LESSON} studentCode={code} />
      </div>
    </section>
  );
}
