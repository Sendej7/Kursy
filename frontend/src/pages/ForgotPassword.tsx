import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-3">Zresetuj hasło</h1>
      <p className="text-sm text-gray-600 mb-6">
        Wpisz email swojego konta — wyślemy na niego link do resetu hasła.
      </p>

      {sent ? (
        <div className="border rounded-md p-4 bg-green-50 text-sm">
          Jeśli konto istnieje, link został wysłany.
          <br />
          <span className="text-xs text-gray-600 mt-2 block">
            (Tryb developerski: zobacz konsolę backendu, żeby skopiować link.)
          </span>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="ty@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
          >
            {pending ? 'Wysyłam…' : 'Wyślij link'}
          </button>
        </form>
      )}

      <p className="text-sm text-gray-600 mt-4">
        <Link to="/login" className="underline">
          ← Wróć do logowania
        </Link>
      </p>
    </section>
  );
}
