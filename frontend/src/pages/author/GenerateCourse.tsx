import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type CourseLanguage } from '@/lib/api';
import { toast } from '@/lib/toast';

interface LessonRow {
  title: string;
  summary: string;
  topic: string;
}

interface ModuleRow {
  title: string;
  description: string;
  lessons: LessonRow[];
}

interface Outline {
  title: string;
  description: string;
  modules: ModuleRow[];
}

type Step = 'source' | 'edit' | 'importing' | 'done';

export default function GenerateCourse() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('source');
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<CourseLanguage>('Python');
  const [titleHint, setTitleHint] = useState('');
  const [outline, setOutline] = useState<Outline | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState<{ slug: string; modules: number; lessons: number } | null>(null);

  async function generateOutline() {
    setPending(true);
    setError(null);
    try {
      const res = await api.author.proposeOutline(text, language, titleHint || undefined);
      setOutline({
        title: res.title,
        description: res.description,
        modules: res.modules.map((m) => ({
          title: m.title,
          description: m.description,
          lessons: m.lessons.map((l) => ({ title: l.title, summary: l.summary, topic: l.topic })),
        })),
      });
      setStep('edit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  async function importNow() {
    if (!outline) return;
    setStep('importing');
    setError(null);
    const total = outline.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    setProgress(`AI pisze ${total} lekcji — może chwilę zająć…`);
    try {
      const res = await api.author.importOutline({
        title: outline.title,
        description: outline.description,
        language,
        modules: outline.modules,
      });
      setDone(res);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
      setStep('edit');
    }
  }

  function patchModule(idx: number, patch: Partial<ModuleRow>) {
    if (!outline) return;
    const next = { ...outline, modules: [...outline.modules] };
    next.modules[idx] = { ...next.modules[idx], ...patch };
    setOutline(next);
  }

  function patchLesson(modIdx: number, lessIdx: number, patch: Partial<LessonRow>) {
    if (!outline) return;
    const next = { ...outline, modules: [...outline.modules] };
    const lessons = [...next.modules[modIdx].lessons];
    lessons[lessIdx] = { ...lessons[lessIdx], ...patch };
    next.modules[modIdx] = { ...next.modules[modIdx], lessons };
    setOutline(next);
  }

  function addLesson(modIdx: number) {
    if (!outline) return;
    const next = { ...outline, modules: [...outline.modules] };
    const lessons = [...next.modules[modIdx].lessons, { title: '', summary: '', topic: '' }];
    next.modules[modIdx] = { ...next.modules[modIdx], lessons };
    setOutline(next);
  }

  function removeLesson(modIdx: number, lessIdx: number) {
    if (!outline) return;
    const next = { ...outline, modules: [...outline.modules] };
    next.modules[modIdx] = {
      ...next.modules[modIdx],
      lessons: next.modules[modIdx].lessons.filter((_, i) => i !== lessIdx),
    };
    setOutline(next);
  }

  function addModule() {
    if (!outline) return;
    setOutline({
      ...outline,
      modules: [...outline.modules, { title: '', description: '', lessons: [] }],
    });
  }

  function removeModule(idx: number) {
    if (!outline) return;
    setOutline({ ...outline, modules: outline.modules.filter((_, i) => i !== idx) });
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Wygeneruj cały kurs</h1>
      <ol className="text-xs text-gray-500 mb-6 flex gap-2">
        <li className={step === 'source' ? 'font-bold text-black' : ''}>1. Materiał</li>
        <span>→</span>
        <li className={step === 'edit' ? 'font-bold text-black' : ''}>2. Edycja struktury</li>
        <span>→</span>
        <li className={step === 'importing' ? 'font-bold text-black' : ''}>3. Generowanie lekcji</li>
        <span>→</span>
        <li className={step === 'done' ? 'font-bold text-black' : ''}>4. Gotowe</li>
      </ol>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {step === 'source' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Wgraj PDF lub PPTX albo wklej tekst (notatki, fragment skryptu, sylabus, slajdy). AI
            zaproponuje strukturę kursu — moduły i lekcje. Potem ją edytujesz, a AI wygeneruje
            treść każdej lekcji osobno.
          </p>
          <label className="block">
            <span className="text-xs">Wgraj PDF lub PPTX (opcjonalnie)</span>
            <input
              type="file"
              accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"
              className="mt-1 block text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const isPptx = file.name.toLowerCase().endsWith('.pptx');
                const isPdf = file.name.toLowerCase().endsWith('.pdf');
                if (!isPdf && !isPptx) {
                  toast.error('Obsługiwane formaty: PDF i PPTX.');
                  e.target.value = '';
                  return;
                }
                setPending(true);
                try {
                  const res = isPptx ? await api.extractPptx(file) : await api.extractPdf(file);
                  setText(res.text);
                  toast.success(`Wczytano ${res.length.toLocaleString()} znaków z ${res.fileName}`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Nie udało się wczytać pliku.');
                } finally {
                  setPending(false);
                  e.target.value = '';
                }
              }}
            />
          </label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Sugerowany tytuł kursu (opcjonalnie)"
            value={titleHint}
            onChange={(e) => setTitleHint(e.target.value)}
          />
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value as CourseLanguage)}
          >
            <option>Python</option>
            <option>JavaScript</option>
            <option>TypeScript</option>
            <option>CSharp</option>
            <option>Sql</option>
          </select>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm font-mono"
            rows={14}
            placeholder="Wklej tekst (notatki, sylabus, treść PDF)…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
            onClick={generateOutline}
            disabled={pending || text.trim().length < 50}
          >
            {pending ? 'AI projektuje strukturę…' : 'Zaproponuj strukturę'}
          </button>
        </div>
      )}

      {step === 'edit' && outline && (
        <div className="space-y-4">
          <input
            className="w-full border rounded-md px-3 py-2 text-lg font-bold"
            value={outline.title}
            onChange={(e) => setOutline({ ...outline, title: e.target.value })}
          />
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm"
            rows={2}
            value={outline.description}
            onChange={(e) => setOutline({ ...outline, description: e.target.value })}
          />

          {outline.modules.map((m, mi) => (
            <div key={mi} className="border rounded-lg bg-white p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded-md px-2 py-1 text-sm font-medium"
                  value={m.title}
                  onChange={(e) => patchModule(mi, { title: e.target.value })}
                />
                <button
                  className="text-xs text-red-600"
                  onClick={() => removeModule(mi)}
                >
                  Usuń moduł
                </button>
              </div>
              <input
                className="w-full border rounded-md px-2 py-1 text-xs"
                placeholder="Opis modułu"
                value={m.description}
                onChange={(e) => patchModule(mi, { description: e.target.value })}
              />
              <ul className="space-y-2 pl-4">
                {m.lessons.map((l, li) => (
                  <li key={li} className="border rounded-md p-2 bg-gray-50 space-y-1">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border rounded-md px-2 py-1 text-sm"
                        placeholder="Tytuł lekcji"
                        value={l.title}
                        onChange={(e) => patchLesson(mi, li, { title: e.target.value })}
                      />
                      <button className="text-xs text-red-600" onClick={() => removeLesson(mi, li)}>
                        Usuń
                      </button>
                    </div>
                    <input
                      className="w-full border rounded-md px-2 py-1 text-xs"
                      placeholder="Krótkie streszczenie (1 zdanie)"
                      value={l.summary}
                      onChange={(e) => patchLesson(mi, li, { summary: e.target.value })}
                    />
                    <input
                      className="w-full border rounded-md px-2 py-1 text-xs"
                      placeholder={'Topic — co AI ma uczyć (np. „pętla while w Pythonie")'}
                      value={l.topic}
                      onChange={(e) => patchLesson(mi, li, { topic: e.target.value })}
                    />
                  </li>
                ))}
                <button className="text-xs underline" onClick={() => addLesson(mi)}>
                  + dodaj lekcję
                </button>
              </ul>
            </div>
          ))}

          <button className="text-xs underline" onClick={addModule}>
            + dodaj moduł
          </button>

          <div className="flex gap-2 pt-3 border-t">
            <button
              className="px-3 py-2 bg-black text-white rounded-md text-sm"
              onClick={importNow}
            >
              Generuj treść lekcji i utwórz kurs
            </button>
            <button
              className="px-3 py-2 border rounded-md text-sm"
              onClick={() => setStep('source')}
            >
              Wróć do materiału
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="text-center py-20">
          <div className="text-2xl mb-3">⏳</div>
          <p className="text-sm text-gray-700">{progress}</p>
        </div>
      )}

      {step === 'done' && done && (
        <div className="border rounded-lg bg-white p-6 text-center space-y-3">
          <div className="text-3xl">✅</div>
          <p className="text-sm">
            Kurs utworzony jako szkic: <strong>{done.modules} modułów</strong>, <strong>{done.lessons} lekcji</strong>.
          </p>
          <p className="text-xs text-gray-500">
            Każdą lekcję możesz teraz przejrzeć w edytorze i poprawić ręcznie.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              className="px-3 py-2 bg-black text-white rounded-md text-sm"
              onClick={() => navigate('/author')}
            >
              Do panelu autora
            </button>
            <button
              className="px-3 py-2 border rounded-md text-sm"
              onClick={() => navigate(`/courses/${done.slug}`)}
            >
              Zobacz jako student
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
