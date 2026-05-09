import { lazy, Suspense } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import StreakPill from './components/StreakPill';
import Toaster from './components/Toaster';
import EmailVerifyBanner from './components/EmailVerifyBanner';
import NotificationsBell from './components/NotificationsBell';
import SearchBar from './components/SearchBar';
import CookieBanner from './components/CookieBanner';
import { api } from './lib/api';
import { useAuth } from './lib/auth';

// Strony nieczęste / ciężkie (Monaco, Pyodide, Stripe, panel autora/admina) idą w lazy chunki.
const CourseCatalog = lazy(() => import('./pages/CourseCatalog'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const LessonView = lazy(() => import('./pages/LessonView'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const GitHubCallback = lazy(() => import('./pages/GitHubCallback'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const QuestionDetail = lazy(() => import('./pages/QuestionDetail'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const MyFavorites = lazy(() => import('./pages/MyFavorites'));
const MyAiHistory = lazy(() => import('./pages/MyAiHistory'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const MyCourses = lazy(() => import('./pages/MyCourses'));
const MyCertificates = lazy(() => import('./pages/MyCertificates'));
const CertificateDetail = lazy(() => import('./pages/CertificateDetail'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Account = lazy(() => import('./pages/Account'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const Redeem = lazy(() => import('./pages/Redeem'));
const AuthorDashboard = lazy(() => import('./pages/author/Dashboard'));
const NewCourse = lazy(() => import('./pages/author/NewCourse'));
const CourseEditor = lazy(() => import('./pages/author/CourseEditor'));
const LessonEditor = lazy(() => import('./pages/author/LessonEditor'));
const NewLesson = lazy(() => import('./pages/author/NewLesson'));
const GenerateFromText = lazy(() => import('./pages/author/GenerateFromText'));
const GenerateCourse = lazy(() => import('./pages/author/GenerateCourse'));
const Analytics = lazy(() => import('./pages/author/Analytics'));
const PendingCourses = lazy(() => import('./pages/admin/PendingCourses'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminOrganizations = lazy(() => import('./pages/admin/Organizations'));

function PageFallback() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-3">
      <div className="h-6 w-1/3 bg-gray-100 rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

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
          <SearchBar />
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
              <NotificationsBell />
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
      <EmailVerifyBanner />
      <main className="flex-1">
        <Suspense fallback={<PageFallback />}>
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
            <Route path="/auth/github/callback" element={<GitHubCallback />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/questions/:id" element={<QuestionDetail />} />
            <Route path="/search" element={<SearchResults />} />
            <Route
              path="/my-favorites"
              element={
                <ProtectedRoute>
                  <MyFavorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-ai-history"
              element={
                <ProtectedRoute>
                  <MyAiHistory />
                </ProtectedRoute>
              }
            />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

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
            <Route
              path="/admin/orgs"
              element={
                <ProtectedRoute roles={['Admin']}>
                  <AdminOrganizations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/redeem"
              element={
                <ProtectedRoute>
                  <Redeem />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer className="border-t text-xs text-gray-500 py-3 text-center space-x-3">
        <span>Kursy — polska platforma do nauki kodowania.</span>
        <Link to="/terms" className="hover:underline">
          Regulamin
        </Link>
        <Link to="/privacy" className="hover:underline">
          Prywatność
        </Link>
      </footer>
      <Toaster />
      <CookieBanner />
    </div>
  );
}
