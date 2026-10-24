import { expect, it } from "vitest";
import { topicFrequency } from "./analysis";

it("counts papers, questions and marks per topic from mappings", () => {
  const q = (topic: string | null, marks: number | null = 5) => ({ number: "1", text: "q", page: 1, marks, topic });
  const stats = topicFrequency(
    [{ name: "Trees", module: "M2" }, { name: "Sorting", module: "M1" }, { name: "Graphs", module: "M3" }],
    [
      { id: "p1", name: "2023", questions: [q("Trees"), q("Trees", 10), q("Sorting")] },
      { id: "p2", name: "2024", questions: [q("Trees"), q(null)] },
    ],
  );
  expect(stats[0]).toMatchObject({ topic: "Trees", papers: 2, totalPapers: 2, questions: 3, marks: 20, lastSeen: "2024" });
  expect(stats[1]).toMatchObject({ topic: "Sorting", papers: 1, questions: 1 });
  expect(stats[2]).toMatchObject({ topic: "Graphs", papers: 0, lastSeen: null });
});
