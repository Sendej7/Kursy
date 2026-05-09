import { useState } from 'react';
import { api, type CourseLanguage, type GeneratedLesson } from '@/lib/api';

export default function GenerateFromText() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<CourseLanguage>('Python');
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const res = await api.author.generateFromText(text, language);
      setLesson(res.proposedLesson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Wygeneruj kurs z notatek</h1>
      <p className="text-sm text-gray-600">
        Wklej tekst (notatki, fragment skryptu, opis tematu). AI zaproponuje lekcję — treść, kod startowy, rozwiązanie i testy.
        Zawsze sprawdź zanim zapiszesz.
      </p>

      <div className="space-y-2">
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
          rows={10}
          placeholder="Wklej tekst tu…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
          onClick={generate}
          disabled={pending || !text.trim()}
        >
          {pending ? 'Generuję…' : 'Wygeneruj propozycję'}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>

      {lesson && (
        <article className="border rounded-lg bg-white p-4 space-y-3">
          <h2 className="font-semibold">{lesson.title}</h2>
          <pre className="text-xs whitespace-pre-wrap">{lesson.theory}</pre>
          <div>
            <h3 className="text-xs font-semibold">Kod startowy</h3>
            <pre className="text-xs bg-gray-100 rounded p-2 whitespace-pre-wrap">{lesson.starterCode}</pre>
          </div>
          <div>
            <h3 className="text-xs font-semibold">Rozwiązanie</h3>
            <pre className="text-xs bg-gray-100 rounded p-2 whitespace-pre-wrap">{lesson.solutionCode}</pre>
          </div>
          <div>
            <h3 className="text-xs font-semibold">Testy</h3>
            <pre className="text-xs bg-gray-100 rounded p-2 whitespace-pre-wrap">{lesson.testsCode}</pre>
          </div>
          {lesson.hints.length > 0 && (
            <ul className="text-xs list-disc pl-5">
              {lesson.hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-500">
            Aby zapisać, najpierw stwórz kurs i moduł, potem wklej te treści w edytorze lekcji.
          </p>
        </article>
      )}
    </section>
  );
}
