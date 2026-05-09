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
  modules: CourseModule[];
  isEnrolled: boolean;
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
  user: AuthUser;
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

async function http<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  Object.assign(headers, init?.headers ?? {});

  const wantsAuth = init?.auth !== false;
  if (wantsAuth) {
    const token = useAuth.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    useAuth.getState().clear();
  }

  const ct = res.headers.get('content-type') ?? '';
  const body = ct.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const msg = (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string')
      ? body.error
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

  // courses
  listCourses: () => http<CourseListItem[]>('/courses'),
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
    http<void>(`/lessons/${id}/complete`, {
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
    createCourse: (title: string, description: string, language: CourseLanguage) =>
      http<{ id: string; slug: string }>('/author/courses', {
        method: 'POST',
        body: JSON.stringify({ title, description, language }),
      }),
    updateCourse: (
      id: string,
      payload: {
        title: string;
        description: string;
        language: CourseLanguage;
        visibility: CourseVisibility;
        priceMonthlyPln: number | null;
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
    analytics: (courseId: string) =>
      http<CourseAnalytics>(`/author/courses/${courseId}/analytics`),
  },

  // admin
  admin: {
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
