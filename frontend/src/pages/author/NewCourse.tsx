import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { api, type CourseLanguage } from '@/lib/api';

const LANGUAGES: { value: CourseLanguage; label: string }[] = [
  { value: 'Python',     label: 'Python' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'CSharp',     label: 'C# / .NET' },
  { value: 'Sql',        label: 'SQL' },
];

export default function NewCourse() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<CourseLanguage>('JavaScript');
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await api.author.createCourse(title, description, language, tags);
      navigate(`/author/courses/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="container-narrow py-10 lg:py-16">
      <Link to="/author" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" />
        Panel autora
      </Link>
      <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">Nowy kurs</h1>
      <p className="text-zinc-500 mb-8">Po stworzeniu dodasz moduły i lekcje w edytorze.</p>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Tytuł</span>
          <input
            required
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="np. React od zera"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Opis</span>
          <textarea
            className="input mt-1"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Krótki opis czego nauczy się student…"
          />
        </label>

        <div>
          <span className="text-sm font-medium block mb-2">Język główny</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGUAGES.map((l) => {
              const active = language === l.value;
              return (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLanguage(l.value)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all
                    ${active
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                    }`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Tagi <span className="text-zinc-400 font-normal">(po przecinku)</span></span>
          <input
            className="input mt-1"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="dla-początkujących, frontend, podstawy"
          />
        </label>

        {error && <p className="text-rose-600 text-sm">{error}</p>}

        <button type="submit" disabled={pending} className="btn-brand w-full !py-3">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {pending ? 'Tworzę…' : 'Stwórz kurs'}
        </button>
      </form>
    </section>
  );
}
