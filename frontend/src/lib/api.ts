const BASE = '/api';

export type CourseLanguage = 'Python' | 'JavaScript' | 'TypeScript' | 'CSharp' | 'Sql';

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  language: CourseLanguage;
  priceMonthlyPln: number | null;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => http<{ status: string }>('/health'),
  listCourses: () => http<CourseListItem[]>('/courses'),
  runCode: (language: CourseLanguage, code: string) =>
    http<{ stdout: string; stderr: string; exitCode: number }>('/code/run', {
      method: 'POST',
      body: JSON.stringify({ language, code }),
    }),
  askMentor: (question: string, lessonContext: string, studentCode?: string, errorMessage?: string) =>
    http<{ answer: string }>('/ai/help', {
      method: 'POST',
      body: JSON.stringify({ question, lessonContext, studentCode, errorMessage }),
    }),
};
