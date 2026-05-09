import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Naucz się kodować po polsku</h1>
      <p className="text-lg text-gray-700 mb-8">
        Interaktywne lekcje z AI mentorem mówiącym po polsku. Pisz kod w przeglądarce,
        dostawaj feedback w czasie rzeczywistym, ucz się od najlepszych autorów.
      </p>
      <div className="flex gap-3">
        <Link
          to="/courses"
          className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:opacity-90"
        >
          Przeglądaj kursy
        </Link>
        <Link
          to="/author"
          className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50"
        >
          Stwórz kurs
        </Link>
      </div>
    </section>
  );
}
