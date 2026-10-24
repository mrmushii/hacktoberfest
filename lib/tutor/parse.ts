import { z } from "zod/v4";
import { generate } from "@/lib/ai/client";
import type { Op } from "./types";

export class TutorInputError extends Error {}

export const MAX_OPS = 15;

const VERBS: [RegExp, Op["kind"]][] = [
  [/^(insert|add|push|যোগ)/i, "insert"],
  [/^(delete|remove|মুছ)/i, "delete"],
  [/^(search|find|lookup|খোঁজ|খুঁজ)/i, "search"],
  [/^in-?order/i, "inorder"],
  [/^pre-?order/i, "preorder"],
  [/^post-?order/i, "postorder"],
];
const FILLER = /^(then|and|the|key|keys|values?|numbers?|into|in|a|an|bst|tree|of|traversal|করো|কর|এবং|তারপর|,|;|:|\.)$/i;

// OCR confuses O/o with 0 and l/I with 1 inside numbers; Bangla digits become ASCII.
const fixNumber = (t: string) => t.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6)).replace(/(?<=\d)[Oo]|[Oo](?=\d)/g, "0").replace(/(?<=\d)[lI]|[lI](?=\d)/g, "1");

/** Deterministic: verbs set the current action, numbers after them become ops. Bangla puts the verb last. */
export function parseOps(text: string): { ops: Op[]; unknown: string[] } {
  const ops: Op[] = [];
  const unknown: string[] = [];
  let verb: Op["kind"] | null = null;
  let pending: number[] = [];
  for (const raw of text.split(/[\s,;:।]+/).filter(Boolean)) {
    const tok = fixNumber(raw);
    if (/^-?\d{1,3}$/.test(tok)) {
      const key = Number(tok);
      if (verb === "insert" || verb === "delete" || verb === "search") ops.push({ kind: verb, key });
      else pending.push(key);
      continue;
    }
    const kind = VERBS.find(([re]) => re.test(tok))?.[1];
    if (kind) {
      if (kind === "inorder" || kind === "preorder" || kind === "postorder") ops.push({ kind });
      else {
        ops.push(...pending.map((key) => ({ kind, key })));
        pending = [];
        verb = kind;
      }
    } else if (!FILLER.test(tok)) unknown.push(raw);
  }
  return { ops, unknown };
}

const OpSchema = z.union([
  z.object({ kind: z.enum(["insert", "delete", "search"]), key: z.number().int().min(-999).max(999) }),
  z.object({ kind: z.enum(["inorder", "preorder", "postorder"]) }),
]);

export async function extractOps(text: string): Promise<Op[]> {
  let { ops } = parseOps(text);
  if (!ops.length && text.trim()) {
    const r = await generate({
      task: "tutor.ops@1",
      tier: "fast",
      schema: z.object({ ops: z.array(OpSchema) }),
      system: "Convert a binary search tree exercise into a list of operations in order. kinds: insert, delete, search (with integer key), inorder, preorder, postorder. Return [] if it is not a BST exercise.",
      prompt: text.slice(0, 4000),
    });
    ops = r.data.ops;
  }
  if (!ops.length) throw new TutorInputError("Couldn't find any BST operations. Try e.g. “insert 50, 30, 70 then search 30”.");
  if (ops.length > MAX_OPS) throw new TutorInputError(`That's ${ops.length} operations; the tutor handles up to ${MAX_OPS} at a time.`);
  return ops;
}
