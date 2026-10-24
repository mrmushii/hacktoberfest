import { COMPARED, type NoticeFields } from "./schema";

export type FieldChange = { field: string; label: string; kind: "added" | "modified" | "removed"; before: string | null; after: string | null };

const show = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return null;
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
};

/** Field-by-field comparison of two normalized versions. Unchanged fields are omitted. */
export function diffNotice(prev: NoticeFields, next: NoticeFields): FieldChange[] {
  const out: FieldChange[] = [];
  for (const [field, label] of COMPARED) {
    const before = field === "cancelled" && !prev.cancelled ? null : show(prev[field]);
    const after = field === "cancelled" && !next.cancelled ? null : show(next[field]);
    if (before === after) continue;
    const kind = before === null ? "added" : after === null ? "removed" : "modified";
    out.push({ field, label, kind, before, after });
  }
  return out;
}
