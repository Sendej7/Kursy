import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import CourseCatalog from './pages/CourseCatalog';
import CourseDetail from './pages/CourseDetail';
import LessonView from './pages/LessonView';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthorDashboard from './pages/author/Dashboard';
import NewCourse from './pages/author/NewCourse';
import CourseEditor from './pages/author/CourseEditor';
import LessonEditor from './pages/author/LessonEditor';
import NewLesson from './pages/author/NewLesson';
import GenerateFromText from './pages/author/GenerateFromText';
import GenerateCourse from './pages/author/GenerateCourse';
import Analytics from './pages/author/Analytics';
import PendingCourses from './pages/admin/PendingCourses';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import ProtectedRoute from './components/ProtectedRoute';
import StreakPill from './components/StreakPill';
import Toaster from './components/Toaster';
import MyCourses from './pages/MyCourses';
import MyCertificates from './pages/MyCertificates';
import CertificateDetail from './pages/CertificateDetail';
import Leaderboard from './pages/Leaderboard';
import Pricing from './pages/Pricing';
import Account from './pages/Account';
import InvoiceDetail from './pages/InvoiceDetail';
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
          <Link to="/leaderboard" className="hover:underline">
            Top XP
          </Link>
          <Link to="/pricing" className="hover:underline">
            Cennik
          </Link>
          {auth.isAuthenticated() && (
            <>
              <Link to="/my-courses" className="hover:underline">
                Moje kursy
              </Link>
              <Link to="/my-certificates" className="hover:underline">
                Certyfikaty
              </Link>
            </>
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
              <StreakPill />
              <Link to="/account" className="text-gray-500 hover:underline">
                {auth.user?.displayName}
              </Link>
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
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute>
                <InvoiceDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/courses/:slug/lessons/:lessonId" element={<LessonView />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/my-courses"
            element={
              <ProtectedRoute>
                <MyCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-certificates"
            element={
              <ProtectedRoute>
                <MyCertificates />
              </ProtectedRoute>
            }
          />
          <Route path="/certificates/:code" element={<CertificateDetail />} />

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
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pending"
            element={
              <ProtectedRoute roles={['Admin']}>
                <PendingCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['Admin']}>
                <AdminUsers />
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
