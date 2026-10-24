"use client";

import { useState, type ReactNode } from "react";

type Q = { question: string; options: string[]; answer: number; explanation: string };

/** Multiple-choice list with instant per-option feedback. `after` adds e.g. a page citation under the explanation. */
export function Quiz<T extends Q>({ questions, onAnswer, after }: { questions: T[]; onAnswer?: (q: T, chosen: number, correct: boolean) => void; after?: (q: T) => ReactNode }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  return (
    <ol className="list-decimal space-y-4 pl-5 text-sm">
      {questions.map((q, i) => (
        <li key={i}>
          <p className="font-medium">{q.question}</p>
          <div className="mt-2 grid gap-1.5">
            {q.options.map((o, j) => {
              const chosen = picked[i];
              const tone = chosen === undefined ? "" : j === q.answer ? "border-emerald-500 bg-emerald-500/10" : j === chosen ? "border-red-500 bg-red-500/10" : "";
              return (
                <button
                  key={j}
                  disabled={chosen !== undefined}
                  onClick={() => (setPicked({ ...picked, [i]: j }), onAnswer?.(q, j, j === q.answer))}
                  className={`rounded-lg border border-line px-3 py-1.5 text-left ${tone}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {picked[i] !== undefined && (
            <p className="mt-2 text-xs text-muted">
              {q.explanation}
              {after?.(q)}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
