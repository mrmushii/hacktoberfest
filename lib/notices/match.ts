import { eventKey } from "./normalize";
import type { NoticeFields } from "./schema";

export type Candidate = { id: string; courseCode: string | null; department: string; eventType: string; fields: NoticeFields; updatedAt: Date };

export type Match =
  | { kind: "new" }
  | { kind: "update"; noticeId: string; certain: boolean; reason: string };

/**
 * Deterministic: same department + course + event type + specific event name.
 * Midterm vs Final of the same course never merge. Several hits → most recent, flagged for confirmation.
 */
export function matchNotice(f: NoticeFields, candidates: Candidate[]): Match {
  const hits = candidates
    .filter(
      (c) =>
        c.department === f.department &&
        c.courseCode === f.courseCode &&
        c.eventType === f.eventType &&
        eventKey(c.fields.eventName) === eventKey(f.eventName),
    )
    .sort((a, b) => +b.updatedAt - +a.updatedAt);
  if (hits.length === 0) return { kind: "new" };
  const certain = hits.length === 1 && f.courseCode !== null;
  return {
    kind: "update",
    noticeId: hits[0].id,
    certain,
    reason: certain
      ? `Same course, event and department as an existing notice`
      : hits.length > 1
        ? `${hits.length} similar notices found — confirm this is the right one`
        : `No course code to confirm the match — please review`,
  };
}
