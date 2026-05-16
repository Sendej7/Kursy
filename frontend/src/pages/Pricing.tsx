import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import Seo from '@/components/Seo';

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
    <section className="container-page py-16 lg:py-20 relative overflow-hidden">
      <Seo title="Cennik" description="Prosty cennik: darmowe kursy zawsze + Pro za 30 zł miesięcznie odblokowuje wszystko." />
      <div className="absolute inset-0 bg-radial-fade pointer-events-none -z-10" />

      <div className="text-center mb-12 max-w-2xl mx-auto">
        <span className="badge-brand mb-4">
          <Sparkles className="w-3 h-3" />
          Prosty cennik
        </span>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
          Jeden plan, wszystkie kursy.
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mt-3">
          Bez ukrytych opłat. Anuluj kiedy chcesz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <article className="card p-8 flex flex-col">
          <h2 className="font-semibold text-lg tracking-tight">Darmowy</h2>
          <p className="text-sm text-zinc-500 mt-1">Na start. Bez karty.</p>
          <div className="mt-6 mb-6">
            <span className="text-5xl font-bold">0</span>
            <span className="text-zinc-500 ml-1">zł / zawsze</span>
          </div>
          <ul className="text-sm space-y-3 text-zinc-700 dark:text-zinc-300 flex-1">
            <Item>Wszystkie darmowe kursy</Item>
            <Item>AI mentor po polsku</Item>
            <Item>Quizy + automatyczne testy</Item>
            <Item>Certyfikat po ukończeniu kursu</Item>
            <Item>Ranking + streaki + odznaki</Item>
          </ul>
          <button
            onClick={() => navigate(isAuthed ? '/courses' : '/register')}
            className="btn-secondary w-full mt-8"
          >
            {isAuthed ? 'Przeglądaj kursy' : 'Załóż konto'}
          </button>
        </article>

        <article className="card p-8 flex flex-col relative ring-2 ring-brand-500 shadow-glow">
          <span className="absolute -top-3 right-6 badge-brand !text-xs !font-semibold !px-3">
            <Zap className="w-3 h-3" />
            Polecany
          </span>
          <h2 className="font-semibold text-lg tracking-tight">Pro</h2>
          <p className="text-sm text-zinc-500 mt-1">Odblokuj wszystkie kursy.</p>
          <div className="mt-6 mb-6">
            <span className="text-5xl font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">30</span>
            <span className="text-zinc-500 ml-1">zł / mies</span>
          </div>
          <ul className="text-sm space-y-3 text-zinc-700 dark:text-zinc-300 flex-1">
            <Item><strong>Wszystko z planu darmowego</strong></Item>
            <Item><strong>Wszystkie kursy płatne</strong></Item>
            <Item>Priorytetowe wsparcie</Item>
            <Item>BLIK / Przelewy24 / karta</Item>
            <Item>Faktura VAT</Item>
          </ul>
          <button onClick={subscribe} className="btn-brand w-full mt-8 !py-3">
            Subskrybuj Pro
          </button>
          <p className="text-xs text-zinc-500 mt-3 text-center">
            Anuluj w panelu, bez zobowiązań.
          </p>
        </article>
      </div>

      <div className="mt-16 max-w-2xl mx-auto text-center">
        <h3 className="text-xl font-semibold tracking-tight">Masz organizację lub szkołę?</h3>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm">
          Generuj kody dostępu dla uczniów. Faktura zbiorcza, dedykowany account manager.
        </p>
        <a
          href="mailto:hello@kursy.pl?subject=Plan%20dla%20organizacji"
          className="btn-secondary mt-4"
        >
          Skontaktuj się z nami
        </a>
      </div>
    </section>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
