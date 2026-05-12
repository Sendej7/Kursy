import { useEffect, useState } from 'react';

interface Question {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface Quiz {
  intro?: string;
  passingPercentage: number;
  questions: Question[];
}

interface Props {
  value: string;
  onChange: (json: string) => void;
}

function emptyQuiz(): Quiz {
  return { intro: '', passingPercentage: 70, questions: [] };
}

function parse(value: string): Quiz {
  if (!value.trim()) return emptyQuiz();
  try {
    const parsed = JSON.parse(value) as Partial<Quiz>;
    return {
      intro: parsed.intro ?? '',
      passingPercentage: typeof parsed.passingPercentage === 'number' ? parsed.passingPercentage : 70,
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.map((q, i) => ({
            id: q.id || `q${i + 1}`,
            prompt: q.prompt || '',
            options: Array.isArray(q.options) ? q.options : ['', ''],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: q.explanation || '',
          }))
        : [],
    };
  } catch {
    return emptyQuiz();
  }
}

function nextId(quiz: Quiz): string {
  let n = quiz.questions.length + 1;
  const used = new Set(quiz.questions.map((q) => q.id));
  while (used.has(`q${n}`)) n++;
  return `q${n}`;
}

export default function QuizAuthor({ value, onChange }: Props) {
  const [quiz, setQuiz] = useState<Quiz>(() => parse(value));

  useEffect(() => {
    setQuiz(parse(value));
  }, [value]);

  function update(next: Quiz) {
    setQuiz(next);
    onChange(JSON.stringify(next, null, 2));
  }

  function addQuestion() {
    update({
      ...quiz,
      questions: [
        ...quiz.questions,
        { id: nextId(quiz), prompt: '', options: ['', ''], correctIndex: 0, explanation: '' },
      ],
    });
  }

  function updateQuestion(i: number, patch: Partial<Question>) {
    const next = [...quiz.questions];
    next[i] = { ...next[i], ...patch };
    update({ ...quiz, questions: next });
  }

  function removeQuestion(i: number) {
    update({ ...quiz, questions: quiz.questions.filter((_, idx) => idx !== i) });
  }

  function addOption(qi: number) {
    const q = quiz.questions[qi];
    updateQuestion(qi, { options: [...q.options, ''] });
  }

  function updateOption(qi: number, oi: number, text: string) {
    const q = quiz.questions[qi];
    const next = [...q.options];
    next[oi] = text;
    updateQuestion(qi, { options: next });
  }

  function removeOption(qi: number, oi: number) {
    const q = quiz.questions[qi];
    if (q.options.length <= 2) return;
    const next = q.options.filter((_, idx) => idx !== oi);
    let correct = q.correctIndex;
    if (correct === oi) correct = 0;
    else if (correct > oi) correct -= 1;
    updateQuestion(qi, { options: next, correctIndex: correct });
  }

  return (
    <div className="space-y-3 border rounded-md p-3 bg-white">
      <label className="block">
        <span className="text-xs text-gray-600">Wstęp (markdown, opcjonalny)</span>
        <textarea
          className="mt-1 w-full border rounded-md px-2 py-1 text-sm font-mono"
          rows={2}
          value={quiz.intro ?? ''}
          onChange={(e) => update({ ...quiz, intro: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-xs text-gray-600">Próg zaliczenia (%)</span>
        <input
          type="number"
          min={0}
          max={100}
          className="mt-1 w-24 border rounded-md px-2 py-1 text-sm"
          value={quiz.passingPercentage}
          onChange={(e) => update({ ...quiz, passingPercentage: Number(e.target.value) || 0 })}
        />
      </label>

      <div className="space-y-3">
        {quiz.questions.map((q, qi) => (
          <div key={q.id} className="border rounded-md p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Pytanie {qi + 1}</span>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => removeQuestion(qi)}
              >
                usuń
              </button>
            </div>
            <textarea
              className="w-full border rounded-md px-2 py-1 text-sm"
              rows={2}
              placeholder="Treść pytania…"
              value={q.prompt}
              onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
            />
            <div className="mt-2 space-y-1">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correctIndex === oi}
                    onChange={() => updateQuestion(qi, { correctIndex: oi })}
                    title="Poprawna odpowiedź"
                  />
                  <input
                    className="flex-1 border rounded-md px-2 py-1 text-sm"
                    placeholder={`Opcja ${oi + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={q.options.length <= 2}
                    className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-30"
                    onClick={() => removeOption(qi, oi)}
                    title="Usuń opcję"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-gray-600 hover:text-black"
                onClick={() => addOption(qi)}
              >
                + dodaj opcję
              </button>
            </div>
            <input
              className="mt-2 w-full border rounded-md px-2 py-1 text-sm"
              placeholder="Wyjaśnienie (opcjonalne; pokazywane po odpowiedzi)"
              value={q.explanation ?? ''}
              onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="text-sm px-3 py-1.5 border rounded-md hover:bg-gray-50"
        onClick={addQuestion}
      >
        + Dodaj pytanie
      </button>
    </div>
  );
}
