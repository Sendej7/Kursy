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
  averageRating: number;
  reviewCount: number;
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
  averageRating: number;
  reviewCount: number;
  isFavorited: boolean;
}

export interface FavoriteCourse {
  courseId: string;
  slug: string;
  title: string;
  description: string;
  language: CourseLanguage;
  priceMonthlyPln: number | null;
  tags: string[];
  averageRating: number;
  reviewCount: number;
}

export interface CourseReview {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseReviewsResponse {
  summary: { count: number; average: number };
  reviews: CourseReview[];
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

export interface TwoFactorChallenge {
  pending2fa: true;
  pendingToken: string;
  email: string;
}

export function isTwoFactorChallenge(r: AuthResponse | TwoFactorChallenge): r is TwoFactorChallenge {
  return (r as TwoFactorChallenge).pending2fa === true;
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
    http<AuthResponse | TwoFactorChallenge>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false,
    }),

  loginTwoFactor: (email: string, pendingToken: string, code: string) =>
    http<AuthResponse>('/auth/login-2fa', {
      method: 'POST',
      body: JSON.stringify({ email, pendingToken, code }),
      auth: false,
    }),

  twoFactor: {
    status: () => http<{ enabled: boolean }>('/auth/2fa/status'),
    setup: () =>
      http<{ secret: string; otpAuthUri: string }>('/auth/2fa/setup', { method: 'POST' }),
    enable: (code: string) =>
      http<{ backupCodes: string[] }>('/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    disable: (code: string) =>
      http<void>('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }),
    regenerateBackupCodes: (code: string) =>
      http<{ backupCodes: string[] }>('/auth/2fa/backup-codes', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    backupCodesRemaining: () =>
      http<{ remaining: number }>('/auth/2fa/backup-codes/remaining'),
  },

  logout: () => http<void>('/auth/logout', { method: 'POST' }),

  googleLogin: (idToken: string) =>
    http<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      auth: false,
    }),

  githubLogin: (code: string) =>
    http<AuthResponse>('/auth/github', {
      method: 'POST',
      body: JSON.stringify({ code }),
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

  verifyEmail: (code: string) =>
    http<{ ok: boolean }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ code }),
      auth: false,
    }),

  resendVerification: () =>
    http<{ ok: boolean }>('/auth/resend-verification', { method: 'POST' }),

  search: (q: string, take = 10) =>
    http<{
      courses: { id: string; slug: string; title: string; description: string; language: string }[];
      lessons: {
        id: string;
        title: string;
        courseId: string;
        courseSlug: string;
        courseTitle: string;
        snippet: string;
      }[];
      questions: {
        id: string;
        title: string;
        lessonId: string;
        courseSlug: string;
        answerCount: number;
        isResolved: boolean;
      }[];
    }>(`/search?q=${encodeURIComponent(q)}&take=${take}`, { auth: false }),

  qa: {
    listForLesson: (lessonId: string) =>
      http<
        {
          id: string;
          title: string;
          authorDisplayName: string;
          authorAvatarUrl: string | null;
          createdAt: string;
          answerCount: number;
          isResolved: boolean;
        }[]
      >(`/lessons/${lessonId}/questions`, { auth: false }),
    createQuestion: (lessonId: string, payload: { title: string; body?: string | null }) =>
      http<{ id: string }>(`/lessons/${lessonId}/questions`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    get: (questionId: string) =>
      http<{
        id: string;
        lessonId: string;
        authorId: string;
        authorDisplayName: string;
        authorAvatarUrl: string | null;
        title: string;
        body: string | null;
        createdAt: string;
        acceptedAnswerId: string | null;
        answers: {
          id: string;
          authorId: string;
          authorDisplayName: string;
          authorAvatarUrl: string | null;
          body: string;
          upvotes: number;
          votedByMe: boolean;
          isAccepted: boolean;
          createdAt: string;
        }[];
      }>(`/questions/${questionId}`, { auth: false }),
    answer: (questionId: string, body: string) =>
      http<{ id: string }>(`/questions/${questionId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    accept: (questionId: string, answerId: string) =>
      http<void>(`/questions/${questionId}/accept-answer/${answerId}`, { method: 'POST' }),
    upvote: (answerId: string) =>
      http<{ upvotes: number; votedByMe: boolean }>(`/answers/${answerId}/upvote`, {
        method: 'POST',
      }),
  },

  privacy: {
    /** Pobiera JSON dump i zapisuje plik użytkownikowi (RODO art. 15). */
    exportData: async () => {
      const token = useAuth.getState().token;
      const res = await fetch(`${BASE}/me/export`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(res.status, body?.error ?? `${res.status} ${res.statusText}`, body);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kursy-pl-moje-dane-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    deleteAccount: (payload: { password?: string; twoFactorCode?: string }) =>
      http<void>('/me/delete', { method: 'POST', body: JSON.stringify(payload) }),
  },

  notifications: {
    list: (take = 20) =>
      http<
        {
          id: string;
          type: string;
          title: string;
          body: string | null;
          url: string | null;
          createdAt: string;
          readAt: string | null;
        }[]
      >(`/me/notifications?take=${take}`),
    unreadCount: () => http<{ count: number }>('/me/notifications/unread-count'),
    markRead: (id: string) =>
      http<void>(`/me/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () =>
      http<void>('/me/notifications/read-all', { method: 'POST' }),
  },

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

  toggleFavorite: (courseId: string) =>
    http<{ favorited: boolean }>(`/courses/${courseId}/favorite`, { method: 'POST' }),
  myFavorites: () => http<FavoriteCourse[]>('/courses/favorites/mine'),
  aiHistory: (take = 30) =>
    http<
      {
        id: string;
        lessonId: string | null;
        lessonTitle: string | null;
        courseSlug: string | null;
        courseTitle: string | null;
        question: string;
        answer: string;
        createdAt: string;
      }[]
    >(`/ai/history?take=${take}`),

  reviews: {
    list: (courseId: string) => http<CourseReviewsResponse>(`/courses/${courseId}/reviews`, { auth: false }),
    upsert: (courseId: string, payload: { rating: number; comment?: string | null }) =>
      http<void>(`/courses/${courseId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteMine: (courseId: string) =>
      http<void>(`/courses/${courseId}/reviews/me`, { method: 'DELETE' }),
    mine: (courseId: string) =>
      http<{ rating: number; comment: string | null; updatedAt: string } | null>(
        `/courses/${courseId}/reviews/me`,
      ),
  },
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

  extractPptx: async (file: File): Promise<{ text: string; length: number; fileName: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    const token = useAuth.getState().token;
    const res = await fetch(`${BASE}/author/extract-pptx`, {
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


  // organizations / B2B codes
  redeemCode: (code: string) =>
    http<{ organizationName: string | null; accessUntil: string; grantsMonths: number }>(
      '/me/redeem',
      { method: 'POST', body: JSON.stringify({ code }) },
    ),

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
    listOrgs: () =>
      http<
        {
          id: string;
          name: string;
          nip: string | null;
          contactEmail: string | null;
          ownerUserId: string | null;
          ownerEmail: string | null;
          codes: number;
          redemptions: number;
        }[]
      >('/admin/orgs'),
    createOrg: (payload: { name: string; nip?: string; contactEmail?: string; ownerUserId?: string }) =>
      http<{ id: string }>('/admin/orgs', { method: 'POST', body: JSON.stringify(payload) }),
    listOrgCodes: (orgId: string) =>
      http<
        {
          id: string;
          code: string;
          maxSeats: number;
          redeemedCount: number;
          grantsMonths: number;
          expiresAt: string | null;
          revokedAt: string | null;
          isUsable: boolean;
        }[]
      >(`/admin/orgs/${orgId}/codes`),
    createOrgCode: (orgId: string, payload: { maxSeats: number; grantsMonths: number; expiresAt?: string | null }) =>
      http<{ id: string; code: string; maxSeats: number; grantsMonths: number; expiresAt: string | null }>(
        `/admin/orgs/${orgId}/codes`,
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    revokeOrgCode: (orgId: string, codeId: string) =>
      http<void>(`/admin/orgs/${orgId}/codes/${codeId}/revoke`, { method: 'POST' }),

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
