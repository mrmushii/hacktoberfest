import { expect, it } from "vitest";
import { layout, toElements } from "./layout";
import type { TreeNode } from "./types";

const leaf = (key: number): TreeNode => ({ key, left: null, right: null });
const tree: TreeNode = { key: 50, left: leaf(30), right: leaf(70) };

it("layout places in-order left to right", () => {
  const at = Object.fromEntries(layout(tree).map((p) => [p.key, p]));
  expect(at[30].x).toBeLessThan(at[50].x);
  expect(at[50].x).toBeLessThan(at[70].x);
  expect(at[30].y).toBe(at[70].y);
  expect(at[30].y).toBeGreaterThan(at[50].y);
});

it("layout of empty tree is []", () => {
  expect(layout(null)).toEqual([]);
});

it("toElements draws a node per key, an arrow per edge, and highlights", () => {
  const els = toElements({ root: tree, highlight: [30], event: "" });
  expect(els.filter((e) => e.type === "ellipse")).toHaveLength(3);
  expect(els.filter((e) => e.type === "arrow")).toHaveLength(2);
  expect(els.find((e) => e.id === "n30")).toMatchObject({ strokeColor: "#e8590c" });
  expect(els.find((e) => e.id === "n50")).not.toMatchObject({ strokeColor: "#e8590c" });
});
