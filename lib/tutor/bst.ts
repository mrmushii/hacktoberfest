import type { Op, TreeNode, TreeState } from "./types";

const node = (key: number, left: TreeNode | null = null, right: TreeNode | null = null): TreeNode => ({ key, left, right });

/** Pure BST engine: one state per comparison or visit, trees never mutated. */
export function run(ops: Op[]): TreeState[] {
  const out: TreeState[] = [];
  let root: TreeNode | null = null;
  const emit = (event: string, highlight: number[] = []) => out.push({ root, highlight, event });

  for (const op of ops) {
    if (op.kind === "insert") {
      const path: number[] = [];
      let dup = false;
      const ins = (n: TreeNode | null): TreeNode => {
        if (!n) return node(op.key);
        path.push(n.key);
        if (op.key === n.key) {
          dup = true;
          return n;
        }
        const left = op.key < n.key;
        emit(`insert ${op.key}: compare with ${n.key}, ${op.key} ${left ? "<" : ">"} ${n.key}, go ${left ? "left" : "right"}`, [...path]);
        return left ? node(n.key, ins(n.left), n.right) : node(n.key, n.left, ins(n.right));
      };
      const next = ins(root);
      if (dup) emit(`insert ${op.key}: ${op.key} already exists, tree unchanged`, [op.key]);
      else {
        const parent = path.at(-1);
        root = next;
        emit(parent === undefined ? `insert ${op.key} as the root` : `insert ${op.key} as ${op.key < parent ? "left" : "right"} child of ${parent}`, [op.key]);
      }
    } else if (op.kind === "search") {
      const path: number[] = [];
      let n = root;
      while (n && n.key !== op.key) {
        path.push(n.key);
        const left = op.key < n.key;
        emit(`search ${op.key}: compare with ${n.key}, go ${left ? "left" : "right"}`, [...path]);
        n = left ? n.left : n.right;
      }
      if (n) emit(`search ${op.key}: found ${op.key}`, [...path, n.key]);
      else emit(`search ${op.key}: reached an empty spot, ${op.key} not found`, path);
    } else if (op.kind === "delete") {
      let msg = `delete ${op.key}: ${op.key} not found, tree unchanged`;
      const del = (n: TreeNode | null, key: number): TreeNode | null => {
        if (!n) return null;
        if (key < n.key) return node(n.key, del(n.left, key), n.right);
        if (key > n.key) return node(n.key, n.left, del(n.right, key));
        if (!n.left || !n.right) {
          if (key === op.key) msg = `delete ${key}: it has ${n.left || n.right ? "one child, which takes its place" : "no children, remove it"}`;
          return n.left ?? n.right;
        }
        let s = n.right;
        while (s.left) s = s.left;
        msg = `delete ${key}: it has two children, replace it with in-order successor ${s.key}`;
        return node(s.key, n.left, del(n.right, s.key));
      };
      if (root) emit(`delete ${op.key}: find ${op.key}`, [op.key]);
      root = del(root, op.key);
      emit(msg);
    } else {
      const seen: number[] = [];
      const visit = (n: TreeNode | null) => {
        if (!n) return;
        if (op.kind === "preorder") seen.push(n.key);
        visit(n.left);
        if (op.kind === "inorder") seen.push(n.key);
        visit(n.right);
        if (op.kind === "postorder") seen.push(n.key);
      };
      visit(root);
      seen.forEach((_, i) => emit(`${op.kind} traversal: visit ${seen[i]}`, seen.slice(0, i + 1)));
      emit(`${op.kind} traversal result: ${seen.join(", ") || "empty tree"}`);
    }
  }
  return out;
}
