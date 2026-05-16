import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Play, Loader2, Copy, Check } from 'lucide-react';
import { runJs } from '@/lib/jsRunner';
import { runPython } from '@/lib/pyodide';

interface Props {
  content: string;
}

/**
 * Renderuje markdown lekcji z interaktywnymi blokami kodu.
 * Bloki ```js / ```javascript / ```python dostają przycisk "Uruchom".
 */
export default function MarkdownLesson({ content }: Props) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre({ children, ...props }) {
          // ReactMarkdown przekazuje <pre><code class="language-X">...</code></pre>
          const codeEl = (children as any)?.props;
          const className: string = codeEl?.className || '';
          const langMatch = className.match(/language-(\w+)/);
          const lang = langMatch?.[1]?.toLowerCase();
          const rawCode = extractText(codeEl?.children);

          const runnable = lang === 'js' || lang === 'javascript' || lang === 'python' || lang === 'py';

          return (
            <CodeBlock
              lang={lang}
              code={rawCode}
              runnable={runnable}
              originalPre={<pre {...props}>{children}</pre>}
            />
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function extractText(children: any): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children?.props?.children !== undefined) return extractText(children.props.children);
  return '';
}

interface CodeBlockProps {
  lang?: string;
  code: string;
  runnable: boolean;
  originalPre: React.ReactNode;
}

function CodeBlock({ lang, code, runnable, originalPre }: CodeBlockProps) {
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setOutput('');
    try {
      const isJs = lang === 'js' || lang === 'javascript';
      const res = isJs ? await runJs(code) : await runPython(code);
      setOutput(res.stdout || '(brak outputu)');
      if (res.error) setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="not-prose my-4 rounded-xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lift">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          {lang && (
            <span className="text-xs font-mono text-zinc-500 ml-2">{lang}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded transition-colors flex items-center gap-1"
            title="Kopiuj"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'OK' : 'Kopiuj'}
          </button>
          {runnable && (
            <button
              onClick={run}
              disabled={running}
              className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
              title="Uruchom kod"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {running ? 'Uruchamiam…' : 'Uruchom'}
            </button>
          )}
        </div>
      </div>

      <div className="text-sm">
        {originalPre}
      </div>

      {(output !== null || error) && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-xs font-mono space-y-1">
          {output && (
            <pre className="text-zinc-300 whitespace-pre-wrap">{output}</pre>
          )}
          {error && (
            <pre className="text-rose-400 whitespace-pre-wrap">{error}</pre>
          )}
        </div>
      )}
    </div>
  );
}
