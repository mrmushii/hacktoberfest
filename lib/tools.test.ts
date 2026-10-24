import { expect, it } from "vitest";
import { Profile } from "./onboarding";
import { TOOLS, filterTools } from "./tools";

it("filters tools by search words and category", () => {
  expect(filterTools(TOOLS, "past paper", "All").map((t) => t.id)).toEqual(["examgraph"]);
  expect(filterTools(TOOLS, "", "Documents").map((t) => t.id)).toEqual(["cover", "assignment", "slides"]);
  expect(filterTools(TOOLS, "quiz", "Planning")).toEqual([]);
  expect(filterTools(TOOLS, "", "All")).toHaveLength(TOOLS.length);
});

it("validates and normalizes onboarding profiles", () => {
  const ok = Profile.parse({ name: "Ayesha", university: "DU", department: "cse", semester: "5", section: "a", notifyTypes: ["exam"] });
  expect(ok).toMatchObject({ department: "CSE", semester: 5, section: "A", language: "en", courseIds: [] });
  expect(Profile.safeParse({ ...ok, notifyTypes: [] }).success).toBe(false);
  expect(Profile.safeParse({ ...ok, department: "Computer Science!" }).success).toBe(false);
});
