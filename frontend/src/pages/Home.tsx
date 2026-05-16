import { Link } from 'react-router-dom';
import {
  Sparkles,
  Code2,
  Bot,
  Users,
  Trophy,
  Zap,
  ArrowRight,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react';
import RecommendedCourses from '@/components/RecommendedCourses';
import Seo from '@/components/Seo';

export default function Home() {
  return (
    <>
      <Seo
        title="Kursy.pl — interaktywna nauka kodowania po polsku"
        description="Python, JavaScript w przeglądarce. AI mentor odpowiada po polsku. Darmowe kursy + Pro subskrypcja."
      />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-fade pointer-events-none" />
        <div className="absolute inset-0 bg-grid-light dark:bg-grid-dark bg-[size:32px_32px] opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />

        <div className="container-page relative pt-20 pb-16 lg:pt-28 lg:pb-24 text-center animate-slide-up">
          <span className="badge-brand mb-6">
            <Sparkles className="w-3 h-3" />
            Po polsku · z AI mentorem
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Naucz się kodować —{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              z mentorem
            </span>
            ,<br className="hidden sm:inline" /> który nie zostawia Cię samego.
          </h1>
          <p className="text-lg lg:text-xl text-zinc-600 dark:text-zinc-400 mt-6 max-w-2xl mx-auto leading-relaxed">
            Piszesz kod w przeglądarce, dostajesz feedback po polsku w czasie rzeczywistym.
            Kursy poprawiają się same — bo widzą, gdzie ludzie się gubią.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-10">
            <Link to="/courses" className="btn-brand !px-6 !py-3 !text-base">
              <PlayCircle className="w-5 h-5" />
              Przeglądaj kursy
            </Link>
            <Link to="/register" className="btn-secondary !px-6 !py-3 !text-base">
              Załóż darmowe konto
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Bez instalacji — w przeglądarce</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pierwsze kursy gratis</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Certyfikat po ukończeniu</span>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="container-page py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Wszystko, czego potrzebujesz żeby zacząć
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-3 max-w-xl mx-auto">
            Edytor, runner, mentor i progres — wszystko w jednym miejscu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Feature
            icon={Code2}
            title="Interaktywne lekcje"
            body="Markdown + kod uruchamiany lokalnie w przeglądarce. Monaco editor — taki sam jak w VS Code."
            iconColor="text-brand-600 bg-brand-50 dark:bg-brand-900/30"
          />
          <Feature
            icon={Bot}
            title="AI mentor po polsku"
            body="Claude jako mentor. Naprowadza, nie daje gotowca. Tłumaczy błędy, odpowiada na pytania."
            iconColor="text-purple-600 bg-purple-50 dark:bg-purple-900/30"
          />
          <Feature
            icon={Users}
            title="Dla autorów"
            body="Twórz kursy ręcznie albo generuj z notatek. AI sugeruje poprawki tam, gdzie studenci się gubią."
            iconColor="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30"
          />
          <Feature
            icon={Zap}
            title="Streaki + XP"
            body="Codzienne cele utrzymają cię w rytmie. Streak rośnie z każdym dniem, w którym się uczysz."
            iconColor="text-amber-600 bg-amber-50 dark:bg-amber-900/30"
          />
          <Feature
            icon={Trophy}
            title="Certyfikaty"
            body="Po ukończeniu kursu generujemy PDF z weryfikowalnym kodem. Podziel się na LinkedIn."
            iconColor="text-rose-600 bg-rose-50 dark:bg-rose-900/30"
          />
          <Feature
            icon={Sparkles}
            title="Quizy i wyzwania"
            body="Sprawdź swoją wiedzę quizami. Pisz kod, który przechodzi automatyczne testy."
            iconColor="text-sky-600 bg-sky-50 dark:bg-sky-900/30"
          />
        </div>
      </section>

      {/* ─── RECOMMENDED COURSES ─── */}
      <section className="container-page py-12 lg:py-16">
        <RecommendedCourses />
      </section>

      {/* ─── DEMO CTA ─── */}
      <section className="container-page pb-20">
        <div className="card bg-gradient-to-br from-brand-600 to-brand-800 dark:from-brand-700 dark:to-brand-900 border-0 text-white p-8 lg:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-dark bg-[size:24px_24px] opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative">
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Spróbuj demo</h2>
            <p className="text-brand-100 mt-2 max-w-lg mx-auto">
              Zaloguj się jako <code className="bg-white/10 px-1.5 py-0.5 rounded">demo@kursy.pl</code> /{' '}
              <code className="bg-white/10 px-1.5 py-0.5 rounded">demo1234</code> i zobacz panel autora.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 hover:bg-zinc-100 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Zaloguj jako demo
              </Link>
              <Link
                to="/courses"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors backdrop-blur"
              >
                Przeglądaj kursy
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
  iconColor,
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
  iconColor: string;
}) {
  return (
    <div className="card-hover p-6 group">
      <div className={`inline-flex w-10 h-10 items-center justify-center rounded-xl mb-4 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-base tracking-tight">{title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}
