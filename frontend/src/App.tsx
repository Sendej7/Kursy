import { Link, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import CourseCatalog from './pages/CourseCatalog';
import LessonView from './pages/LessonView';

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">
            Kursy
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/courses" className="hover:underline">
              Katalog
            </Link>
            <Link to="/author" className="hover:underline">
              Dla autorów
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<CourseCatalog />} />
          <Route path="/courses/:slug/lessons/:lessonId" element={<LessonView />} />
        </Routes>
      </main>
      <footer className="border-t text-xs text-gray-500 py-3 text-center">
        Kursy — polska platforma do nauki kodowania.
      </footer>
    </div>
  );
}
