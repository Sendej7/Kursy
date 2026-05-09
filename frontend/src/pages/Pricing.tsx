import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

export default function Pricing() {
  const navigate = useNavigate();
  const isAuthed = useAuth((s) => s.isAuthenticated());

  async function subscribe() {
    if (!isAuthed) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }
    try {
      const res = await api.billing.checkout();
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Płatność niedostępna.');
    }
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center">Cennik</h1>
      <p className="text-center text-gray-600 mt-2">Jeden plan, wszystkie kursy. Anuluj kiedy chcesz.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10 max-w-2xl mx-auto">
        <article className="border rounded-lg bg-white p-6">
          <h2 className="font-semibold text-lg">Darmowy</h2>
          <p className="text-3xl font-bold mt-2">0 zł</p>
          <ul className="text-sm space-y-1 mt-4 text-gray-700">
            <li>✓ Darmowe kursy</li>
            <li>✓ AI mentor po polsku</li>
            <li>✓ Certyfikaty</li>
          </ul>
        </article>

        <article className="border-2 border-black rounded-lg bg-white p-6 relative">
          <span className="absolute -top-3 right-4 text-xs bg-black text-white px-2 py-0.5 rounded-full">
            polecany
          </span>
          <h2 className="font-semibold text-lg">Pro</h2>
          <p className="text-3xl font-bold mt-2">
            30 zł<span className="text-base font-normal text-gray-500"> / mies</span>
          </p>
          <ul className="text-sm space-y-1 mt-4 text-gray-700">
            <li>✓ Wszystko z planu darmowego</li>
            <li>✓ <strong>Wszystkie kursy płatne</strong></li>
            <li>✓ Priorytetowe wsparcie</li>
            <li>✓ BLIK / Przelewy24 / karta</li>
          </ul>
          <button
            onClick={subscribe}
            className="w-full mt-6 px-3 py-2 bg-black text-white rounded-md text-sm font-medium hover:opacity-90"
          >
            Subskrybuj
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">Anuluj kiedy chcesz, bez zobowiązań.</p>
        </article>
      </div>
    </section>
  );
}
