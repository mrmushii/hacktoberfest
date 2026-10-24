import { z } from "zod/v4";

export const EVENT_TYPES = ["exam", "class", "assignment", "registration", "event", "other"] as const;

export const NoticeFields = z.object({
  title: z.string(),
  publishedOn: z.string().nullable().describe("YYYY-MM-DD date the notice itself was issued"),
  department: z.string().describe("Short code like CSE, EEE"),
  courseCode: z.string().nullable().describe("e.g. CSE-301, null if none"),
  eventType: z.enum(EVENT_TYPES),
  eventName: z.string().describe("Which event, e.g. Midterm, Final, Quiz 2, Assignment 2 — not the course name"),
  semester: z.number().int().nullable(),
  sections: z.array(z.string()).describe("Section letters like A, B; [] when all sections"),
  date: z.string().nullable().describe("YYYY-MM-DD the exam/class/event takes place; not the notice issue date"),
  time: z.string().nullable().describe("24h HH:MM start time"),
  room: z.string().nullable(),
  deadline: z.string().nullable().describe("YYYY-MM-DD for submission/registration deadlines"),
  cancelled: z.boolean(),
  actions: z.array(z.string()).describe("What students must do"),
  evidence: z.array(z.object({ field: z.string(), quote: z.string() })).describe("Exact source text for each extracted field"),
  uncertain: z.array(z.string()).describe("Field names that are unclear or illegible"),
});
export type NoticeFields = z.infer<typeof NoticeFields>;

/** Factual fields compared between versions. Title and actions are free prose the model rewords, so they are shown, not diffed. */
export const COMPARED: [keyof NoticeFields, string][] = [
  ["date", "Date"],
  ["time", "Time"],
  ["room", "Room"],
  ["deadline", "Deadline"],
  ["sections", "Sections"],
  ["semester", "Semester"],
  ["cancelled", "Cancelled"],
];
