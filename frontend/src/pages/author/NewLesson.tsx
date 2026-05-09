import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type LessonType } from '@/lib/api';

export default function NewLesson() {
  const { moduleId = '' } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [order, setOrder] = useState(1);
  const [type, setType] = useState<LessonType>('Exercise');
  const [content, setContent] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await api.author.createLesson({
        moduleId,
        title,
        order,
        type,
        contentMarkdown: content,
      });
      navigate(`/author/lessons/${res.id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Nowa lekcja</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="Tytuł"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            type="number"
            className="border rounded-md px-3 py-2 text-sm w-24"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
          <select
            className="border rounded-md px-3 py-2 text-sm flex-1"
            value={type}
            onChange={(e) => setType(e.target.value as LessonType)}
          >
            <option>Theory</option>
            <option>Exercise</option>
            <option>Quiz</option>
          </select>
        </div>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm font-mono"
          rows={10}
          placeholder="Treść lekcji w markdown"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
        >
          {pending ? 'Tworzę…' : 'Stwórz lekcję'}
        </button>
      </form>
    </section>
  );
}
