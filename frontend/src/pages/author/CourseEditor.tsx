import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Eye,
  Copy as CopyIcon,
  BarChart3,
  Send,
  Bot,
  Plus,
  Edit3,
  Loader2,
  GripVertical,
  BookOpen,
} from 'lucide-react';
import { api, type CourseVisibility } from '@/lib/api';
import { toast } from '@/lib/toast';
import SortableList from '@/components/SortableList';
import Seo from '@/components/Seo';

const VIS_BADGE: Record<string, string> = {
  Public: 'badge-emerald',
  Draft: 'badge-neutral',
  Private: 'badge-neutral',
  PendingReview: 'badge-amber',
  Archived: 'badge-neutral',
};

export default function CourseEditor() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: courses } = useQuery({
    queryKey: ['author', 'courses'],
    queryFn: () => api.author.listMyCourses(),
  });
  const course = courses?.find((c) => c.id === id);

  const detail = useQuery({
    queryKey: ['course', course?.slug ?? ''],
    queryFn: () => api.getCourse(course!.slug),
    enabled: !!course?.slug,
  });

  const [moduleTitle, setModuleTitle] = useState('');

  const addModule = useMutation({
    mutationFn: () =>
      api.author.createModule({
        courseId: id,
        title: moduleTitle,
        description: '',
        order: (detail.data?.modules.length ?? 0) + 1,
      }),
    onSuccess: () => {
      setModuleTitle('');
      qc.invalidateQueries({ queryKey: ['course', course?.slug] });
      toast.success('Moduł dodany');
    },
  });

  const updateMeta = useMutation({
    mutationFn: (visibility: CourseVisibility) =>
      api.author.updateCourse(id, {
        title: course!.title,
        description: course!.description,
        language: course!.language,
        priceMonthlyPln: course!.priceMonthlyPln,
        visibility,
        aiMentorPromptOverride: course!.aiMentorPromptOverride,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['author', 'courses'] });
      toast.success('Status zmieniony');
    },
  });

  const [aiPromptDraft, setAiPromptDraft] = useState<string | null>(null);
  const aiPromptCurrent = aiPromptDraft ?? course?.aiMentorPromptOverride ?? '';
  const aiPromptDirty = aiPromptDraft !== null && aiPromptDraft !== (course?.aiMentorPromptOverride ?? '');

  const saveAiPrompt = useMutation({
    mutationFn: () =>
      api.author.updateCourse(id, {
        title: course!.title,
        description: course!.description,
        language: course!.language,
        priceMonthlyPln: course!.priceMonthlyPln,
        visibility: course!.visibility,
        aiMentorPromptOverride: aiPromptCurrent.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Instrukcje AI zaktualizowane');
      setAiPromptDraft(null);
      qc.invalidateQueries({ queryKey: ['author', 'courses'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd'),
  });

  const duplicate = useMutation({
    mutationFn: () => api.author.duplicateCourse(id),
    onSuccess: (res) => {
      toast.success('Kurs zduplikowany');
      qc.invalidateQueries({ queryKey: ['author', 'courses'] });
      navigate(`/author/courses/${res.id}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd'),
  });

  const reorderModules = useMutation({
    mutationFn: (moduleIds: string[]) => api.author.reorderModules(id, moduleIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', course?.slug] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd'),
  });

  const reorderLessons = useMutation({
    mutationFn: (args: { moduleId: string; lessonIds: string[] }) =>
      api.author.reorderLessons(args.moduleId, args.lessonIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', course?.slug] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd'),
  });

  if (!course) {
    return (
      <div className="container-page py-10">
        <div className="h-8 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <section className="container-page py-6 lg:py-10 space-y-6">
      <Seo title={`Edytor: ${course.title}`} />

      <div>
        <Link to="/author" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />
          Panel autora
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{course.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge-neutral">{course.language}</span>
              <span className={VIS_BADGE[course.visibility]}>{course.visibility}</span>
              {!course.priceMonthlyPln && <span className="badge-emerald">darmowe</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/courses/${course.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-sm"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </Link>
            <Link
              to={`/author/courses/${id}/analytics`}
              className="btn-ghost text-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analityka</span>
            </Link>
            <button
              onClick={() => {
                if (confirm('Utworzyć kopię tego kursu?')) duplicate.mutate();
              }}
              disabled={duplicate.isPending}
              className="btn-secondary text-sm"
            >
              <CopyIcon className="w-4 h-4" />
              Duplikuj
            </button>
            {course.visibility === 'Draft' && (
              <button
                className="btn-brand text-sm"
                onClick={() => updateMeta.mutate('PendingReview')}
              >
                <Send className="w-4 h-4" />
                Do recenzji
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI mentor instructions */}
      <details className="card p-5">
        <summary className="cursor-pointer text-sm font-semibold flex items-center gap-2 hover:text-brand-600">
          <Bot className="w-4 h-4 text-purple-600" />
          AI mentor — dodatkowe instrukcje (opcjonalne)
        </summary>
        <p className="text-xs text-zinc-500 mt-3 mb-2">
          Doczepione do system promptu mentora dla studentów Twojego kursu. Przykład: „odpowiadaj zwięźle", „używaj analogii kuchennych".
        </p>
        <textarea
          className="input mt-2 font-mono text-xs"
          rows={4}
          maxLength={2000}
          placeholder={'np. „W tym kursie używamy PEP8. Mentor powinien chwalić zwięzłość."'}
          value={aiPromptCurrent}
          onChange={(e) => setAiPromptDraft(e.target.value)}
        />
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-zinc-400">{aiPromptCurrent.length} / 2000</span>
          <button
            onClick={() => saveAiPrompt.mutate()}
            disabled={!aiPromptDirty || saveAiPrompt.isPending}
            className="btn-brand text-xs"
          >
            {saveAiPrompt.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Zapisz instrukcje
          </button>
        </div>
      </details>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold text-lg tracking-tight">Moduły i lekcje</h2>
          <span className="text-xs text-zinc-500">Przeciągnij <GripVertical className="inline w-3 h-3" /> by zmienić kolejność</span>
        </div>

        {detail.data && detail.data.modules.length > 0 && (
          <SortableList
            items={detail.data.modules}
            onReorder={(newOrder) => reorderModules.mutate(newOrder.map((m) => m.id))}
            renderItem={(m) => (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                  <span className="font-semibold tracking-tight text-sm flex items-center gap-2">
                    <span className="text-zinc-400 font-mono">{String(m.order).padStart(2, '0')}</span>
                    {m.title}
                  </span>
                  <Link
                    to={`/author/modules/${m.id}/lessons/new`}
                    className="btn-ghost !p-1.5 !text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Lekcja
                  </Link>
                </div>
                {m.lessons.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-zinc-500 text-center">
                    Brak lekcji. <Link to={`/author/modules/${m.id}/lessons/new`} className="underline text-brand-600">Dodaj pierwszą</Link>
                  </p>
                ) : (
                  <div className="px-3 py-2">
                    <SortableList
                      items={m.lessons}
                      onReorder={(newOrder) =>
                        reorderLessons.mutate({ moduleId: m.id, lessonIds: newOrder.map((l) => l.id) })
                      }
                      renderItem={(l) => (
                        <div className="flex items-center justify-between text-sm py-1.5 group">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="text-zinc-400 text-xs font-mono w-6">{l.order}.</span>
                            <span className="truncate">{l.title}</span>
                            <span className="text-[10px] text-zinc-400 ml-1">{l.type}</span>
                          </span>
                          <Link
                            to={`/author/lessons/${l.id}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost !p-1 !text-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          />
        )}

        {detail.data && detail.data.modules.length === 0 && (
          <div className="card p-12 text-center">
            <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">Brak modułów. Dodaj pierwszy poniżej.</p>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-sm tracking-tight mb-3">Dodaj nowy moduł</h3>
        <div className="flex gap-2">
          <input
            className="input"
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            placeholder={'Tytuł modułu (np. „Podstawy języka")'}
          />
          <button
            className="btn-brand shrink-0"
            onClick={() => moduleTitle && addModule.mutate()}
            disabled={addModule.isPending || !moduleTitle}
          >
            {addModule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Dodaj
          </button>
        </div>
      </div>
    </section>
  );
}
