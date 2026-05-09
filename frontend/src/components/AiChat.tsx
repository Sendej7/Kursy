import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Props {
  lessonId?: string;
  lessonContext: string;
  studentCode?: string;
  errorMessage?: string;
}

interface Message {
  role: 'user' | 'mentor';
  text: string;
}

export default function AiChat({ lessonId, lessonContext, studentCode, errorMessage }: Props) {
  const isAuthed = useAuth((s) => s.isAuthenticated());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  async function send() {
    if (!input.trim() || pending) return;
    if (!isAuthed) {
      setMessages((m) => [...m, { role: 'mentor', text: 'Zaloguj się, by porozmawiać z mentorem.' }]);
      return;
    }
    const question = input.trim();
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setPending(true);
    try {
      const res = await api.askMentor(lessonId ?? null, question, lessonContext, studentCode, errorMessage);
      setMessages((m) => [...m, { role: 'mentor', text: res.answer }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Coś poszło nie tak.';
      setMessages((m) => [...m, { role: 'mentor', text: msg }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border rounded-lg bg-white flex flex-col h-80">
      <header className="px-3 py-2 border-b text-sm font-semibold">AI mentor</header>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-gray-500">Cześć! Utknąłeś? Napisz, w czym mogę pomóc.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={
                m.role === 'user'
                  ? 'inline-block bg-black text-white rounded-md px-2 py-1 max-w-[85%] whitespace-pre-wrap'
                  : 'inline-block bg-gray-100 rounded-md px-2 py-1 max-w-[85%] whitespace-pre-wrap'
              }
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t p-2 flex gap-2">
        <input
          className="flex-1 border rounded-md px-2 py-1 text-sm"
          placeholder="Zadaj pytanie…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={pending}
        />
        <button
          className="px-3 py-1 bg-black text-white rounded-md text-sm disabled:opacity-50"
          onClick={send}
          disabled={pending}
        >
          Wyślij
        </button>
      </div>
    </div>
  );
}
