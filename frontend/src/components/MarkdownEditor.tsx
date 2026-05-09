import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

interface Props {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}

type Mode = 'edit' | 'split' | 'preview';

/**
 * Edytor markdown z live preview. Trzy widoki: edit / split / preview.
 * Domyślnie split na desktopie, edit na wąskim viewport.
 */
export default function MarkdownEditor({ value, onChange, rows = 16, placeholder }: Props) {
  const [mode, setMode] = useState<Mode>('split');

  const showEditor = mode === 'edit' || mode === 'split';
  const showPreview = mode === 'preview' || mode === 'split';

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 border-b px-2 py-1 text-xs">
        <span className="text-gray-500">Markdown</span>
        <div className="flex gap-1">
          {(['edit', 'split', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                'px-2 py-0.5 rounded ' +
                (mode === m ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-200')
              }
            >
              {m === 'edit' ? 'Edycja' : m === 'split' ? 'Podział' : 'Podgląd'}
            </button>
          ))}
        </div>
      </div>

      <div className={'grid ' + (mode === 'split' ? 'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x' : 'grid-cols-1')}>
        {showEditor && (
          <textarea
            className="w-full px-3 py-2 text-sm font-mono focus:outline-none resize-y"
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? 'Wpisz markdown…'}
          />
        )}
        {showPreview && (
          <div className="px-3 py-2 prose prose-sm max-w-none overflow-auto" style={{ minHeight: rows * 20 }}>
            {value.trim() ? (
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{value}</ReactMarkdown>
            ) : (
              <p className="text-gray-400 italic">Podgląd pojawi się tu, gdy zaczniesz pisać.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
