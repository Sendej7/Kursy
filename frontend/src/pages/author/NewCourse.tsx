import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type CourseLanguage } from '@/lib/api';

export default function NewCourse() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<CourseLanguage>('Python');
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const res = await api.author.createCourse(title, description, language, tags);
      navigate(`/author/courses/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Nowy kurs</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-sm">Tytuł</span>
          <input
            required
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm">Opis</span>
          <textarea
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm">Język</span>
          <select
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value as CourseLanguage)}
          >
            <option>Python</option>
            <option>JavaScript</option>
            <option>TypeScript</option>
            <option>CSharp</option>
            <option>Sql</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm">Tagi (po przecinku, np. „dla-początkujących, podstawy")</span>
          <input
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="dla-początkujących, podstawy"
          />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-2 bg-black text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          {pending ? 'Tworzę…' : 'Stwórz kurs'}
        </button>
      </form>
    </section>
  );
}
