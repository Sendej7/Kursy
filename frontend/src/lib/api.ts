import { useAuth, type AuthUser } from './auth';

const BASE = '/api';

export type CourseLanguage = 'Python' | 'JavaScript' | 'TypeScript' | 'CSharp' | 'Sql';
export type CourseVisibility = 'Draft' | 'Private' | 'PendingReview' | 'Public' | 'Archived';
export type LessonType = 'Theory' | 'Exercise' | 'Quiz';

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  language: CourseLanguage;
  priceMonthlyPln: number | null;
  tags: string[];
}

export interface LessonSummary {
  id: string;
  title: string;
  order: number;
  type: LessonType;
  isCompleted: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  order: number;
  lessons: LessonSummary[];
}

export interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  language: CourseLanguage;
  priceMonthlyPln: number | null;
  tags: string[];
  modules: CourseModule[];
  isEnrolled: boolean;
}

export interface CertificateMine {
  code: string;
  issuedAt: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
}

export interface CertificateDetail {
  code: string;
  issuedAt: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  learnerName: string;
}

export interface LessonDetail {
  id: string;
  title: string;
  order: number;
  contentMarkdown: string;
  moduleId: string;
  exercise: {
    id: string;
    prompt: string;
    starterCode: string;
    testsCode: string;
    hints: string[];
  } | null;
  isCompleted: boolean;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LessonImprovement {
  diagnosis: string;
  suggestions: string[];
  rewrittenLesson: GeneratedLesson | null;
}

export interface AuthorCourseRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  language: CourseLanguage;
  visibility: CourseVisibility;
  priceMonthlyPln: number | null;
}

export interface LessonAnalyticsRow {
  lessonId: string;
  title: string;
  totalAttempts: number;
  completions: number;
  completionRate: number;
  avgAttempts: number;
  commonErrors: { description: string; occurrences: number }[];
  commonQuestions: { question: string; occurrences: number }[];
}

export interface CourseAnalytics {
  courseId: string;
  enrolled: number;
  lessons: LessonAnalyticsRow[];
}

export interface GeneratedLesson {
  title: string;
  theory: string;
  starterCode: string;
  solutionCode: string;
  testsCode: string;
  hints: string[];
}

class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message);
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const state = useAuth.getState();
  if (!state.refreshToken) return false;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      });
      if (!res.ok) {
        useAuth.getState().clear();
        return false;
      }
      const body = (await res.json()) as AuthResponse;
      useAuth.getState().setAccess(body.token, body.expiresAt, body.refreshToken);
      return true;
    } catch {
      useAuth.getState().clear();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function http<T>(path: string, init?: RequestInit & { auth?: boolean; _retry?: boolean }): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  Object.assign(headers, init?.headers ?? {});

  const wantsAuth = init?.auth !== false;
  if (wantsAuth) {
    const token = useAuth.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 && wantsAuth && !init?._retry) {
    const ok = await tryRefresh();
    if (ok) {
      return http<T>(path, { ...init, _retry: true });
    }
    useAuth.getState().clear();
  }

  const ctype = res.headers.get('content-type') ?? '';
  const body = ctype.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `${res.status} ${res.statusText}`;
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}

export const api = {
  health: () => http<{ status: string }>('/health'),

  // auth
  register: (email: string, password: string, displayName: string, becomeAuthor = false) =>
    http<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, becomeAuthor }),
      auth: false,
    }),
  login: (email: string, password: string) =>
    http<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false,
    }),

  logout: () => http<void>('/auth/logout', { method: 'POST' }),

  googleLogin: (idToken: string) =>
    http<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      auth: false,
    }),

  forgotPassword: (email: string) =>
    http<{ ok: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      auth: false,
    }),

  resetPassword: (code: string, newPassword: string) =>
    http<{ ok: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ code, newPassword }),
      auth: false,
    }),

  // courses
  listCourses: (params?: { q?: string; language?: CourseLanguage; tag?: string }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.language) search.set('language', params.language);
    if (params?.tag) search.set('tag', params.tag);
    const qs = search.toString();
    return http<CourseListItem[]>(`/courses${qs ? `?${qs}` : ''}`, { auth: false });
  },
  listCourseTags: () =>
    http<{ tag: string; count: number }[]>('/courses/tags', { auth: false }),
  getCourse: (slug: string) => http<CourseDetail>(`/courses/${slug}`),
  enrollById: (id: string) => http<void>(`/courses/${id}/enroll`, { method: 'POST' }),
  enrollByCode: (accessCode: string) =>
    http<{ id: string; slug: string }>('/courses/enroll-by-code', {
      method: 'POST',
      body: JSON.stringify({ accessCode }),
    }),

  // lessons
  getLesson: (id: string) => http<LessonDetail>(`/lessons/${id}`),
  completeLesson: (id: string, timeSpentSeconds: number) =>
    http<{
      certificateIssued: boolean;
      certificateCode: string | null;
      xpGained: number;
      currentStreak: number;
      totalXp: number;
      streakBumped: boolean;
    }>(`/lessons/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ timeSpentSeconds }),
    }),

  // submissions
  recordSubmission: (payload: {
    exerciseId: string;
    code: string;
    passed: boolean;
    timeSpentSeconds: number;
    errorMessage?: string | null;
    stdout?: string | null;
  }) =>
    http<{ id: string; attemptNumber: number }>('/submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ai
  askMentor: (
    lessonId: string | null,
    question: string,
    lessonContext: string,
    studentCode?: string,
    errorMessage?: string,
  ) =>
    http<{ answer: string }>('/ai/help', {
      method: 'POST',
      body: JSON.stringify({ lessonId, question, lessonContext, studentCode, errorMessage }),
    }),

  // author
  author: {
    listMyCourses: () => http<AuthorCourseRow[]>('/author/courses'),
    createCourse: (title: string, description: string, language: CourseLanguage, tags?: string[]) =>
      http<{ id: string; slug: string }>('/author/courses', {
        method: 'POST',
        body: JSON.stringify({ title, description, language, tags }),
      }),
    updateCourse: (
      id: string,
      payload: {
        title: string;
        description: string;
        language: CourseLanguage;
        visibility: CourseVisibility;
        priceMonthlyPln: number | null;
        tags?: string[];
      },
    ) =>
      http<void>(`/author/courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    createModule: (payload: { courseId: string; title: string; description: string; order: number }) =>
      http<{ id: string }>('/author/modules', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    createLesson: (payload: {
      moduleId: string;
      title: string;
      order: number;
      type: LessonType;
      contentMarkdown: string;
    }) =>
      http<{ id: string }>('/author/lessons', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateLesson: (
      id: string,
      payload: {
        moduleId: string;
        title: string;
        order: number;
        type: LessonType;
        contentMarkdown: string;
      },
    ) =>
      http<void>(`/author/lessons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    upsertExercise: (
      lessonId: string,
      payload: {
        prompt: string;
        starterCode: string;
        solutionCode: string;
        testsCode: string;
        hints: string[];
      },
    ) =>
      http<void>(`/author/lessons/${lessonId}/exercise`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    generateLesson: (topic: string, previousLessonsContext: string, targetLanguage = 'Python') =>
      http<GeneratedLesson>('/author/generate-lesson', {
        method: 'POST',
        body: JSON.stringify({ topic, previousLessonsContext, targetLanguage }),
      }),
    generateFromText: (sourceText: string, targetLanguage = 'Python') =>
      http<{ proposedLesson: GeneratedLesson }>('/author/generate-from-text', {
        method: 'POST',
        body: JSON.stringify({ sourceText, targetLanguage }),
      }),
    proposeOutline: (sourceText: string, targetLanguage: CourseLanguage = 'Python', courseTitleHint?: string) =>
      http<{
        title: string;
        description: string;
        targetLanguage: string;
        modules: {
          title: string;
          description: string;
          lessons: { title: string; summary: string; topic: string }[];
        }[];
      }>('/author/outline', {
        method: 'POST',
        body: JSON.stringify({ sourceText, targetLanguage, courseTitleHint }),
      }),
    importOutline: (payload: {
      title: string;
      description: string;
      language: CourseLanguage;
      modules: {
        title: string;
        description: string;
        lessons: { title: string; summary: string; topic: string }[];
      }[];
    }) =>
      http<{ id: string; slug: string; modules: number; lessons: number }>('/author/import-outline', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    analytics: (courseId: string) =>
      http<CourseAnalytics>(`/author/courses/${courseId}/analytics`),
    proposeImprovement: (lessonId: string) =>
      http<LessonImprovement>(`/author/lessons/${lessonId}/improve`, { method: 'POST' }),
    applyImprovement: (
      lessonId: string,
      payload: {
        contentMarkdown: string;
        starterCode: string;
        solutionCode: string;
        testsCode: string;
        hints: string[];
      },
    ) =>
      http<void>(`/author/lessons/${lessonId}/apply-improvement`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  // billing
  billing: {
    status: () =>
      http<{
        configured: boolean;
        hasSubscription: boolean;
        isActive: boolean;
        status: string;
        currentPeriodEnd: string | null;
        cancelAtPeriodEnd: boolean;
      }>('/billing/status'),
    checkout: () => http<{ url: string }>('/billing/checkout', { method: 'POST' }),
    portal: (returnUrl: string) =>
      http<{ url: string }>('/billing/portal', {
        method: 'POST',
        body: JSON.stringify({ returnUrl }),
      }),
    getProfile: () =>
      http<{
        companyName: string | null;
        nip: string | null;
        addressLine: string | null;
        postalCode: string | null;
        city: string | null;
        country: string;
      }>('/billing/profile'),
    updateProfile: (payload: {
      companyName?: string | null;
      nip?: string | null;
      addressLine?: string | null;
      postalCode?: string | null;
      city?: string | null;
      country?: string;
    }) =>
      http<void>('/billing/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  invoices: {
    mine: () =>
      http<
        {
          id: string;
          number: string;
          issuedAt: string;
          grossAmount: number;
          currency: string;
          description: string;
        }[]
      >('/invoices/mine'),
    get: (id: string) =>
      http<{
        id: string;
        number: string;
        issuedAt: string;
        paidAt: string | null;
        buyerName: string;
        buyerNip: string | null;
        buyerAddressLine: string | null;
        buyerPostalCode: string | null;
        buyerCity: string | null;
        buyerCountry: string;
        description: string;
        netAmount: number;
        vatRatePct: number;
        vatAmount: number;
        grossAmount: number;
        currency: string;
      }>(`/invoices/${id}`),
  },

  // certificates
  myCertificates: () => http<CertificateMine[]>('/certificates/mine'),
  getCertificate: (code: string) =>
    http<CertificateDetail>(`/certificates/${code}`, { auth: false }),

  // me
  myStats: () =>
    http<{
      totalXp: number;
      currentStreakDays: number;
      longestStreakDays: number;
      lastActiveDay: string | null;
      lessonsCompleted: number;
      certificatesEarned: number;
    }>('/me/stats'),

  leaderboard: () =>
    http<{ displayName: string; totalXp: number; currentStreakDays: number }[]>('/leaderboard', {
      auth: false,
    }),

  myCourses: () =>
    http<
      {
        id: string;
        slug: string;
        title: string;
        description: string;
        language: CourseLanguage;
        lessonsTotal: number;
        lessonsCompleted: number;
        progressPercent: number;
        enrolledAt: string;
        nextLessonId: string | null;
      }[]
    >('/me/courses'),

  lessonNav: (lessonId: string) =>
    http<{
      prevLessonId: string | null;
      prevTitle: string | null;
      nextLessonId: string | null;
      nextTitle: string | null;
      courseId: string;
      courseSlug: string;
      courseTitle: string;
      indexInCourse: number;
      courseTotalLessons: number;
    }>(`/lessons/${lessonId}/nav`, { auth: false }),

  extractPdf: async (file: File): Promise<{ text: string; length: number; fileName: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    const token = useAuth.getState().token;
    const res = await fetch(`${BASE}/author/extract-pdf`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg = body?.error ?? `${res.status} ${res.statusText}`;
      throw new ApiError(res.status, msg, body);
    }
    return res.json();
  },

  // admin
  admin: {
    stats: () =>
      http<{
        users: number;
        authors: number;
        coursesPublic: number;
        coursesPending: number;
        coursesDraft: number;
        submissions: number;
        aiInteractions: number;
        certificates: number;
        lessonsCompletedTotal: number;
      }>('/admin/stats'),
    users: (q?: string) =>
      http<
        {
          id: string;
          email: string;
          displayName: string;
          role: 'Student' | 'Author' | 'Admin';
          createdAt: string;
          authoredCourses: number;
          enrollments: number;
          certificates: number;
        }[]
      >(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    setRole: (userId: string, role: 'Student' | 'Author' | 'Admin') =>
      http<void>(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
    pendingCourses: () =>
      http<
        {
          id: string;
          title: string;
          slug: string;
          description: string;
          language: CourseLanguage;
          authorEmail: string;
          authorName: string;
          modules: number;
          lessons: number;
        }[]
      >('/admin/courses/pending'),
    approveCourse: (id: string) =>
      http<void>(`/admin/courses/${id}/approve`, { method: 'POST' }),
    rejectCourse: (id: string) =>
      http<void>(`/admin/courses/${id}/reject`, { method: 'POST' }),
  },
};

export { ApiError };
