import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Toaster from './components/Toaster';
import EmailVerifyBanner from './components/EmailVerifyBanner';
import CookieBanner from './components/CookieBanner';
import { Header, Footer } from './components/Layout';

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
const AdminPromoCodes = lazy(() => import('./pages/admin/PromoCodes'));
const AdminMetrics = lazy(() => import('./pages/admin/Metrics'));
const EmbedLesson = lazy(() => import('./pages/EmbedLesson'));
const AuthorProfile = lazy(() => import('./pages/AuthorProfile'));
const AuthorPayouts = lazy(() => import('./pages/author/Payouts'));

function PageFallback() {
  return (
    <div className="container-narrow py-10 space-y-3">
      <div className="h-6 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
    </div>
  );
}

export default function App() {
  // Embed mode (iframe na cudzych blogach) — bez Header/Footer/Banner/Toaster/CookieBanner.
  // Wykrywany przez prefix /embed/ w URL.
  const isEmbed = typeof window !== 'undefined' && window.location.pathname.startsWith('/embed/');

  if (isEmbed) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/embed/lessons/:id" element={<EmbedLesson />} />
        </Routes>
      </Suspense>
    );
  }

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
            <Route path="/authors/:id" element={<AuthorProfile />} />
            <Route
              path="/author/payouts"
              element={
                <ProtectedRoute roles={['Author', 'Admin']}>
                  <AuthorPayouts />
                </ProtectedRoute>
              }
            />
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
              path="/admin/promo-codes"
              element={
                <ProtectedRoute roles={['Admin']}>
                  <AdminPromoCodes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/metrics"
              element={
                <ProtectedRoute roles={['Admin']}>
                  <AdminMetrics />
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
      <Footer />
      <Toaster />
      <CookieBanner />
    </div>
  );
}
