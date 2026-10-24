import { z } from "zod";
import { EVENT_TYPES } from "@/lib/notices/schema";

export const PRESET_DEPARTMENTS = ["CSE", "EEE", "BBA", "CE", "ME", "ENG", "LAW", "PHARM"];
export const SECTIONS = ["A", "B", "C", "D"];

export const Profile = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  university: z.string().trim().min(2, "Enter your university"),
  studentId: z.string().trim().max(30).optional().default(""),
  department: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,6}$/, "Use a short code like CSE"),
  semester: z.coerce.number().int().min(1).max(12),
  section: z.string().trim().toUpperCase().regex(/^[A-Z]{1,2}$/, "Pick a section"),
  courseIds: z.array(z.string()).default([]),
  language: z.enum(["en", "bn"]).default("en"),
  notifyTypes: z.array(z.enum(EVENT_TYPES)).min(1, "Pick at least one notice type"),
  theme: z.enum(["system", "light", "dark"]).default("system"),
});
export type Profile = z.infer<typeof Profile>;
