import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, BookOpen, Code as CodeIcon, HelpCircle, Video } from 'lucide-react';
import { api, type LessonType } from '@/lib/api';

const TYPES: { value: LessonType; label: string; icon: typeof BookOpen; desc: string }[] = [
  { value: 'Theory',   label: 'Teoria',    icon: BookOpen,   desc: 'Markdown' },
  { value: 'Exercise', label: 'Ćwiczenie', icon: CodeIcon,   desc: 'Kod + testy' },
  { value: 'Quiz',     label: 'Quiz',      icon: HelpCircle, desc: 'Pytania' },
  { value: 'Video',    label: 'Wideo',     icon: Video,      desc: 'YouTube' },
];

export default function NewLesson() {
  const { moduleId = '' } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [order, setOrder] = useState(1);
  const [type, setType] = useState<LessonType>('Theory');
  const [content, setContent] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await api.author.createLesson({
        moduleId,
        title,
        order,
        type,
        contentMarkdown: content,
      });
      navigate(`/author/lessons/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="container-narrow py-10">
      <Link to="/author" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" />
        Panel autora
      </Link>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Nowa lekcja</h1>
      <p className="text-zinc-500 mb-8">Po stworzeniu dodasz treść w edytorze.</p>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Tytuł</span>
          <input
            required
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="np. Funkcje strzałkowe"
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="block col-span-1">
            <span className="text-sm font-medium">Kolejność</span>
            <input
              type="number"
              min={1}
              className="input mt-1"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
            />
          </label>
        </div>

        <div>
          <span className="text-sm font-medium block mb-2">Typ lekcji</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TYPES.map((t) => {
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
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                    }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${active ? 'text-brand-600' : 'text-zinc-500'}`} />
                  <p className={`text-xs font-semibold ${active ? 'text-brand-700 dark:text-brand-300' : ''}`}>{t.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{t.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {type !== 'Quiz' && type !== 'Video' && (
          <label className="block">
            <span className="text-sm font-medium">Treść początkowa (markdown)</span>
            <textarea
              className="input mt-1 font-mono text-sm"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Tytuł&#10;&#10;Możesz zostawić puste — uzupełnisz w edytorze."
            />
          </label>
        )}

        {error && <p className="text-rose-600 text-sm">{error}</p>}

        <button type="submit" disabled={pending} className="btn-brand w-full !py-3">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {pending ? 'Tworzę…' : 'Stwórz lekcję'}
        </button>
      </form>
    </section>
  );
}
