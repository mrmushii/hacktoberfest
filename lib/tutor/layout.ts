import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { TreeNode, TreeState } from "./types";

const DX = 80;
const DY = 100;
const R = 48; // node diameter
export const HIGHLIGHT = "#e8590c";

/** x from in-order position, y from depth: a BST never overlaps this way. */
export function layout(root: TreeNode | null): { key: number; x: number; y: number }[] {
  const out: { key: number; x: number; y: number }[] = [];
  const walk = (n: TreeNode | null, depth: number) => {
    if (!n) return;
    walk(n.left, depth + 1);
    out.push({ key: n.key, x: out.length * DX, y: depth * DY });
    walk(n.right, depth + 1);
  };
  walk(root, 0);
  return out;
}

export function toElements(state: TreeState): ExcalidrawElementSkeleton[] {
  const pos = new Map(layout(state.root).map((p) => [p.key, p]));
  const nodes: ExcalidrawElementSkeleton[] = [...pos.values()].map(({ key, x, y }) => ({
    type: "ellipse",
    id: `n${key}`,
    x,
    y,
    width: R,
    height: R,
    strokeWidth: 2,
    ...(state.highlight.includes(key) ? { strokeColor: HIGHLIGHT, backgroundColor: "#ffe8cc", fillStyle: "solid" as const } : {}),
    label: { text: String(key), fontSize: 18 },
  }));
  const arrows: ExcalidrawElementSkeleton[] = [];
  const edges = (n: TreeNode | null) => {
    if (!n) return;
    for (const c of [n.left, n.right]) {
      if (!c) continue;
      const a = pos.get(n.key)!;
      const b = pos.get(c.key)!;
      arrows.push({ type: "arrow", id: `e${n.key}-${c.key}`, x: a.x + R / 2, y: a.y + R, points: [[0, 0], [b.x - a.x, b.y - a.y - R]], start: { id: `n${n.key}` }, end: { id: `n${c.key}` } });
      edges(c);
    }
  };
  edges(state.root);
  return [...nodes, ...arrows];
}
