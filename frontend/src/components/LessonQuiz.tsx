import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

interface Props {
  lessonId: string;
  isCompleted: boolean;
}

export default function LessonQuiz({ lessonId, isCompleted }: Props) {
  const isAuthed = useAuth((s) => s.isAuthenticated());
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.submitQuiz>> | null>(null);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', lessonId],
    queryFn: () => api.getQuiz(lessonId),
  });

  const submit = useMutation({
    mutationFn: () =>
      api.submitQuiz(
        lessonId,
        Object.entries(selected).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex })),
      ),
    onSuccess: (res) => {
      setResult(res);
      if (res.passed) {
        toast.success(`Zaliczone! ${res.percentage}%`);
        qc.invalidateQueries({ queryKey: ['lesson', lessonId] });
      } else {
        toast.error(`Wynik ${res.percentage}% — wymagane ${quiz?.passingPercentage}%. Spróbuj ponownie.`);
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd quizu.'),
  });

  if (isLoading) return <p className="text-sm text-gray-500">Ładowanie quizu…</p>;
  if (!quiz || quiz.questions.length === 0) {
    return <p className="text-sm text-gray-500">Quiz jeszcze nie ma pytań.</p>;
  }

  const allAnswered = quiz.questions.every((q) => selected[q.id] !== undefined);

  return (
    <div className="space-y-4">
      {quiz.intro && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{quiz.intro}</ReactMarkdown>
        </div>
      )}
      <p className="text-xs text-gray-500">
        Próg zaliczenia: <strong>{quiz.passingPercentage}%</strong> ({quiz.questions.length} pytań)
      </p>

      <ol className="space-y-4">
        {quiz.questions.map((q, qi) => {
          const perQ = result?.perQuestion.find((p) => p.id === q.id);
          return (
            <li key={q.id} className="border rounded-lg p-4 bg-white">
              <p className="font-medium mb-3">
                {qi + 1}. {q.prompt}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const checked = selected[q.id] === oi;
                  const isCorrectIdx = perQ?.correctIndex === oi;
                  const wasChosen = checked;
                  let cls = 'border-gray-200 hover:bg-gray-50';
                  if (perQ) {
                    if (isCorrectIdx) cls = 'border-green-500 bg-green-50';
                    else if (wasChosen) cls = 'border-red-500 bg-red-50';
                    else cls = 'border-gray-200 opacity-60';
                  } else if (checked) {
                    cls = 'border-black bg-gray-50';
                  }
                  return (
                    <label
                      key={oi}
                      className={`flex items-start gap-2 px-3 py-2 border rounded-md cursor-pointer text-sm ${cls}`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="mt-1"
                        checked={checked}
                        disabled={!!result?.passed || submit.isPending}
                        onChange={() => setSelected((s) => ({ ...s, [q.id]: oi }))}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
              {perQ?.explanation && (
                <p className="text-xs text-gray-600 mt-2 italic">💡 {perQ.explanation}</p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3">
        {isAuthed ? (
          <button
            className="px-3 py-1.5 bg-black text-white rounded-md text-sm font-medium disabled:opacity-50"
            disabled={!allAnswered || submit.isPending || result?.passed}
            onClick={() => submit.mutate()}
          >
            {result?.passed ? '✓ Zaliczone' : submit.isPending ? 'Sprawdzam…' : 'Sprawdź odpowiedzi'}
          </button>
        ) : (
          <p className="text-sm text-gray-500">Zaloguj się, aby zaliczyć quiz.</p>
        )}
        {result && !result.passed && (
          <button
            className="text-sm text-gray-600 underline"
            onClick={() => {
              setResult(null);
              setSelected({});
            }}
          >
            Spróbuj jeszcze raz
          </button>
        )}
        {isCompleted && !result && (
          <span className="text-sm text-green-700">✓ już zaliczyłeś ten quiz</span>
        )}
      </div>
    </div>
  );
}
