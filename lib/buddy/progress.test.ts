import { expect, it } from "vitest";
import { accuracy, streak, weakTopics } from "./progress";
import { grade } from "./ai";

it("weakTopics counts wrong and stuck, worst first", () => {
  const ev = [
    { kind: "wrong", topic: "Heaps" },
    { kind: "stuck", topic: "Heaps" },
    { kind: "wrong", topic: "Graphs" },
    { kind: "correct", topic: "Graphs" },
    { kind: "correct", topic: "Sorting" },
  ];
  expect(weakTopics(ev)).toEqual([
    { topic: "Heaps", misses: 2, correct: 0 },
    { topic: "Graphs", misses: 1, correct: 1 },
  ]);
});

it("accuracy ignores stuck events and is null with no answers", () => {
  expect(accuracy([{ kind: "correct", topic: null }, { kind: "wrong", topic: null }, { kind: "stuck", topic: null }])).toBe(50);
  expect(accuracy([])).toBeNull();
});

it("streak counts back from today, or from yesterday if not studied yet today", () => {
  const today = new Date("2026-10-24T12:00:00Z");
  const d = (s: string) => new Date(`${s}T10:00:00Z`);
  expect(streak([d("2026-10-24"), d("2026-10-23"), d("2026-10-21")], today)).toBe(2);
  expect(streak([d("2026-10-23"), d("2026-10-22")], today)).toBe(2);
  expect(streak([d("2026-10-20")], today)).toBe(0);
});

it("grade marks unanswered as wrong", () => {
  expect(grade([{ answer: 1 }, { answer: 2 }, { answer: 0 }], [1, 3, null])).toEqual([true, false, false]);
});

it("topicBreakdown groups mock results per topic, weakest first", async () => {
  const { topicBreakdown } = await import("./progress");
  const qs = [{ topic: "Heaps" }, { topic: "Graphs" }, { topic: "Heaps" }, { topic: "Graphs" }];
  expect(topicBreakdown(qs, [true, false, false, false])).toEqual([
    { topic: "Graphs", right: 0, total: 2 },
    { topic: "Heaps", right: 1, total: 2 },
  ]);
});

it("voiceConfusions skips the model when the student never spoke", async () => {
  const { voiceConfusions } = await import("./ai");
  expect(await voiceConfusions("any", [{ role: "assistant", text: "Hey! What are you stuck on?" }])).toEqual([]);
});
