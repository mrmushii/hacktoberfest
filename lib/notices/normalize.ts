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
  const publishedOn = normDate(f.publishedOn);
  let date = normDate(f.date);
  // Small models often copy the issue date into the event date.
  if (date && date === publishedOn) {
    date = null;
    uncertain.add("date");
  }
  const deadline = normDate(f.deadline);
  if (f.date && !date) uncertain.add("date");
  if (f.deadline && !deadline) uncertain.add("deadline");
  return {
    ...f,
    title: f.title.trim(),
    publishedOn,
    department: f.department.trim().toUpperCase(),
    courseCode: normCode(f.courseCode),
    eventName: f.eventName.trim(),
    sections: [...new Set(f.sections.map((s) => s.trim().toUpperCase().replace(/^SECTION\s*/, "")).filter((s) => /^[A-Z]{1,2}$/.test(s)))].sort(),
    date,
    deadline,
    time: normTime(f.time),
    room: f.room ? f.room.trim().replace(/^room\s*/i, "").toUpperCase() : null,
    actions: f.actions.map((a) => a.trim()).filter(Boolean),
    uncertain: [...uncertain],
  };
}

/** Canonical event identity from the model's eventName + title, so "Midterm Exam" and "Midterm Examination" match. */
export function eventKey(f: Pick<NoticeFields, "eventName" | "title">): string {
  for (const s of [f.eventName, f.title].map((x) => x.toLowerCase())) {
    if (/\bmid(-|\s)?term|\bmid\b/.test(s)) return "midterm";
    if (/\bfinal\b/.test(s)) return "final";
    const m = s.match(/\b(quiz|assignment|lab|class test|ct|project|presentation)\s*(?:no\.?\s*)?(\d+)?/);
    if (m) return `${m[1].replace("class test", "ct")}-${m[2] ?? ""}`;
  }
  return f.eventName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const DATE_PATTERNS = [
  /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/g,
  /\b\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,}\.?,?\s+\d{4}\b/g,
  /\b[A-Za-z]{3,}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/g,
];

/** Every date literally written in the source, canonicalized. */
export function datesInText(text: string): Set<string> {
  const out = new Set<string>();
  for (const re of DATE_PATTERNS) for (const m of text.match(re) ?? []) {
    const d = normDate(m);
    if (d) out.add(d);
  }
  return out;
}

/** Flag dates the model produced that are not written anywhere in the source — catches misreads. */
export function verifyDates(f: NoticeFields, sourceText: string): NoticeFields {
  const found = datesInText(sourceText);
  if (found.size === 0) return f; // image input: nothing to check against
  const bad = (["date", "deadline", "publishedOn"] as const).filter((k) => f[k] && !found.has(f[k]!));
  return bad.length ? { ...f, uncertain: [...new Set([...f.uncertain, ...bad])] } : f;
}
