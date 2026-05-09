import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CourseVisibility } from '@/lib/api';
import { toast } from '@/lib/toast';
import SortableList from '@/components/SortableList';

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
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['author', 'courses'] }),
  });

  const duplicate = useMutation({
    mutationFn: () => api.author.duplicateCourse(id),
    onSuccess: (res) => {
      toast.success('Kurs zduplikowany — otwieram kopię (jako Draft).');
      qc.invalidateQueries({ queryKey: ['author', 'courses'] });
      navigate(`/author/courses/${res.id}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd.'),
  });

  const reorderModules = useMutation({
    mutationFn: (moduleIds: string[]) => api.author.reorderModules(id, moduleIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', course?.slug] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd kolejności.'),
  });

  const reorderLessons = useMutation({
    mutationFn: (args: { moduleId: string; lessonIds: string[] }) =>
      api.author.reorderLessons(args.moduleId, args.lessonIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', course?.slug] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd kolejności.'),
  });

  if (!course) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Ładowanie…</p>;

  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-xs text-gray-500 mt-1">
            {course.language} · {course.visibility}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (confirm('Utworzyć kopię tego kursu?')) duplicate.mutate();
            }}
            disabled={duplicate.isPending}
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Duplikuj
          </button>
          {course.visibility === 'Draft' && (
            <button
              className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
              onClick={() => updateMeta.mutate('PendingReview')}
            >
              Wyślij do recenzji
            </button>
          )}
          <Link
            to={`/author/courses/${id}/analytics`}
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
          >
            Analityka
          </Link>
        </div>
      </div>

      <h2 className="font-semibold mb-2">Moduły i lekcje</h2>
      <p className="text-xs text-gray-500 mb-3">
        Przeciągnij za uchwyt <code>⋮⋮</code>, by zmienić kolejność modułów lub lekcji w obrębie modułu.
      </p>

      {detail.data && (
        <SortableList
          items={detail.data.modules}
          onReorder={(newOrder) => reorderModules.mutate(newOrder.map((m) => m.id))}
          renderItem={(m) => (
            <div className="border rounded-md bg-white">
              <div className="px-3 py-2 border-b flex items-center justify-between">
                <span className="font-medium text-sm">
                  {m.order}. {m.title}
                </span>
                <Link to={`/author/modules/${m.id}/lessons/new`} className="text-xs underline">
                  + Lekcja
                </Link>
              </div>
              {m.lessons.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-500">brak lekcji</p>
              ) : (
                <div className="px-3 py-2">
                  <SortableList
                    items={m.lessons}
                    onReorder={(newOrder) =>
                      reorderLessons.mutate({ moduleId: m.id, lessonIds: newOrder.map((l) => l.id) })
                    }
                    renderItem={(l) => (
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {l.order}. {l.title}
                        </span>
                        <Link to={`/author/lessons/${l.id}`} className="text-xs underline">
                          Edytuj
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

      <div className="mt-6 border rounded-lg bg-white p-4">
        <h3 className="font-semibold text-sm mb-2">Dodaj moduł</h3>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2 text-sm"
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            placeholder="Tytuł modułu"
          />
          <button
            className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
            onClick={() => moduleTitle && addModule.mutate()}
            disabled={addModule.isPending || !moduleTitle}
          >
            Dodaj
          </button>
        </div>
      </div>
    </section>
  );
}
