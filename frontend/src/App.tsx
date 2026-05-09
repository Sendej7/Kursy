import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import CourseCatalog from './pages/CourseCatalog';
import CourseDetail from './pages/CourseDetail';
import LessonView from './pages/LessonView';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthorDashboard from './pages/author/Dashboard';
import NewCourse from './pages/author/NewCourse';
import CourseEditor from './pages/author/CourseEditor';
import LessonEditor from './pages/author/LessonEditor';
import NewLesson from './pages/author/NewLesson';
import GenerateFromText from './pages/author/GenerateFromText';
import GenerateCourse from './pages/author/GenerateCourse';
import Analytics from './pages/author/Analytics';
import PendingCourses from './pages/admin/PendingCourses';
import ProtectedRoute from './components/ProtectedRoute';
import Toaster from './components/Toaster';
import MyCourses from './pages/MyCourses';
import { api } from './lib/api';
import { useAuth } from './lib/auth';

function Header() {
  const auth = useAuth();
  const navigate = useNavigate();

  async function logout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    } finally {
      auth.clear();
      navigate('/');
    }
  }

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg">
          Kursy
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/courses" className="hover:underline">
            Katalog
          </Link>
          {auth.isAuthenticated() && (
            <Link to="/my-courses" className="hover:underline">
              Moje kursy
            </Link>
          )}
          {auth.user?.role === 'Author' || auth.user?.role === 'Admin' ? (
            <Link to="/author" className="hover:underline">
              Panel autora
            </Link>
          ) : null}
          {auth.user?.role === 'Admin' && (
            <Link to="/admin" className="hover:underline">
              Admin
            </Link>
          )}
          {auth.isAuthenticated() ? (
            <>
              <span className="text-gray-500">{auth.user?.displayName}</span>
              <button onClick={logout} className="text-gray-500 hover:underline">
                Wyloguj
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline">
                Zaloguj
              </Link>
              <Link
                to="/register"
                className="px-3 py-1 bg-black text-white rounded-md text-xs font-medium"
              >
                Załóż konto
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<CourseCatalog />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/courses/:slug/lessons/:lessonId" element={<LessonView />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/my-courses"
            element={
              <ProtectedRoute>
                <MyCourses />
              </ProtectedRoute>
            }
          />

          <Route
            path="/author"
            element={
              <ProtectedRoute roles={['Author', 'Admin']}>
                <AuthorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/author/courses/new"
            element={
              <ProtectedRoute roles={['Author', 'Admin']}>
                <NewCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/author/courses/:id"
            element={
              <ProtectedRoute roles={['Author', 'Admin']}>
                <CourseEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/author/courses/:id/analytics"
            element={
              <ProtectedRoute roles={['Author', 'Admin']}>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/author/lessons/:id"
            element={
              <ProtectedRoute roles={['Author', 'Admin']}>
                <LessonEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/author/modules/:moduleId/lessons/new"
            element={
              <ProtectedRoute roles={['Author', 'Admin']}>
                <NewLesson />
              </ProtectedRoute>
            }
          />
          <Route
            path="/author/generate"
            element={
              <ProtectedRoute roles={['Author', 'Admin']}>
                <GenerateFromText />
              </ProtectedRoute>
            }
          />
          <Route
            path="/author/generate-course"
            element={
              <ProtectedRoute roles={['Author', 'Admin']}>
                <GenerateCourse />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['Admin']}>
                <PendingCourses />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <footer className="border-t text-xs text-gray-500 py-3 text-center">
        Kursy — polska platforma do nauki kodowania.
      </footer>
      <Toaster />
    </div>
  );
}
