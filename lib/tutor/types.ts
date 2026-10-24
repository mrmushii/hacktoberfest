export type TreeNode = { key: number; left: TreeNode | null; right: TreeNode | null };

export type Op = { kind: "insert" | "delete" | "search"; key: number } | { kind: "inorder" | "preorder" | "postorder" };

/** One frame of a lesson. `event` is the machine-written fact the narration is based on. */
export type TreeState = { root: TreeNode | null; highlight: number[]; event: string };
