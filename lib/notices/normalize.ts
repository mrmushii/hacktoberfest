import type { NoticeFields } from "./schema";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Coerce common date spellings to YYYY-MM-DD; returns null if unparseable. */
export function normDate(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // DD/MM/YYYY
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{4})$/);
  if (m) return iso(+m[3], MONTHS.indexOf(m[2].slice(0, 3)) + 1, +m[1]);
  m = s.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (m) return iso(+m[3], MONTHS.indexOf(m[1].slice(0, 3)) + 1, +m[2]);
  return null;
}

function iso(y: number, mo: number, d: number) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function normTime(v: string | null): string | null {
  if (!v) return null;
  const m = v.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;
  let h = +m[1];
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
}

const normCode = (v: string | null) => (v ? v.toUpperCase().replace(/[\s_]+/g, "-").replace(/^([A-Z]+)(\d)/, "$1-$2") : null);

/** Canonical form used for both matching and diffing, so the model's spelling doesn't create fake changes. */
export function normalize(f: NoticeFields): NoticeFields {
  const uncertain = new Set(f.uncertain);
  const date = normDate(f.date);
  const deadline = normDate(f.deadline);
  if (f.date && !date) uncertain.add("date");
  if (f.deadline && !deadline) uncertain.add("deadline");
  return {
    ...f,
    title: f.title.trim(),
    department: f.department.trim().toUpperCase(),
    courseCode: normCode(f.courseCode),
    eventName: f.eventName.trim(),
    sections: [...new Set(f.sections.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort(),
    date,
    deadline,
    time: normTime(f.time),
    room: f.room ? f.room.trim().replace(/^room\s*/i, "").toUpperCase() : null,
    actions: f.actions.map((a) => a.trim()).filter(Boolean),
    uncertain: [...uncertain],
  };
}

export const eventKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
