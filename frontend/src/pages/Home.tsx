import { Link } from 'react-router-dom';
import RecommendedCourses from '@/components/RecommendedCourses';
import Seo from '@/components/Seo';

export default function Home() {
  return (
    <>
      <Seo
        title="Kursy.pl — interaktywna nauka kodowania po polsku"
        description="Python, JavaScript w przeglądarce. AI mentor odpowiada po polsku. Darmowe kursy + Pro subskrypcja."
      />
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-12 text-center">
        <span className="inline-block text-xs uppercase tracking-widest text-gray-500 mb-3">
          Po polsku · z AI mentorem
        </span>
        <h1 className="text-5xl font-bold leading-tight">
          Naucz się kodować —
          <br />
          z mentorem, który nie zostawia Cię samego.
        </h1>
        <p className="text-lg text-gray-700 mt-6 max-w-2xl mx-auto">
          Pisz kod w przeglądarce, dostawaj feedback po polsku w czasie rzeczywistym, ucz się od najlepszych autorów.
          A kursy poprawiają się same — bo widzą, gdzie ludzie się gubią.
        </p>
        <div className="flex justify-center gap-3 mt-8">
          <Link
            to="/courses"
            className="px-5 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-90"
          >
            Przeglądaj kursy
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 border rounded-md text-sm font-medium hover:bg-gray-50"
          >
            Załóż darmowe konto
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Interaktywne lekcje"
          body="Markdown + kod uruchamiany w przeglądarce. Pyodide, Monaco editor — taki sam komfort jak w VS Code."
        />
        <Card
          title="AI mentor po polsku"
          body="Claude jako mentor. Naprowadza, nie daje gotowca. Tłumaczy błędy, odpowiada na pytania."
        />
        <Card
          title="Dla autorów i wykładowców"
          body="Twórz kursy ręcznie albo generuj z notatek. Widzisz, gdzie studenci się gubią — AI sugeruje poprawki."
        />
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 border-t">
        <h2 className="text-2xl font-bold mb-3">Konta demo</h2>
        <p className="text-sm text-gray-700">
          Aby przetestować od strony autora, zaloguj się na <code className="bg-gray-100 px-1 rounded">demo@kursy.pl</code> /{' '}
          <code className="bg-gray-100 px-1 rounded">demo1234</code>. Albo załóż własne konto i zaznacz „autor".
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-12">
        <RecommendedCourses />
      </section>
    </>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="border rounded-lg p-5 bg-white">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-gray-600 mt-2">{body}</p>
    </div>
  );
}
