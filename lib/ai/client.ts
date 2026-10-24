import { z } from "zod/v4";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/hash";

export type Tier = "fast" | "smart";

export class AiError extends Error {}

export type AiResult<T> = { data: T; cached: boolean; durationMs: number; model: string };

const env = (k: string, d: string) => process.env[k] ?? d;

export function modelFor(tier: Tier) {
  return tier === "fast" ? env("MODEL_FAST", "gemma4:e2b") : env("MODEL_SMART", "gemma4:e4b");
}

// Ollama runs one model instance; queue requests so parallel uploads wait instead of failing.
let active = 0;
const waiting: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  const limit = Number(env("AI_CONCURRENCY", "1"));
  if (active >= limit) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

type Generate<S extends z.ZodType> = {
  task: string; // also the prompt version, e.g. "notice.extract@1"
  tier: Tier;
  schema: S;
  system: string;
  prompt: string;
  images?: Uint8Array[];
};

/**
 * Structured generation through Ollama. Results are cached by a hash of
 * model + task + inputs, and only stored once they pass schema validation.
 */
export async function generate<S extends z.ZodType>(req: Generate<S>): Promise<AiResult<z.infer<S>>> {
  const model = modelFor(req.tier);
  const mode = env("CACHE_MODE", "readwrite");
  const key = sha256(model, req.task, req.system, req.prompt, ...(req.images ?? []));

  if (mode !== "off") {
    const hit = await db.aiCache.findUnique({ where: { key } });
    if (hit) {
      const parsed = req.schema.safeParse(JSON.parse(hit.output));
      if (parsed.success) return { data: parsed.data, cached: true, durationMs: hit.durationMs, model };
    }
  }

  const started = Date.now();
  const jsonSchema = z.toJSONSchema(req.schema);
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = await withSlot(() => callOllama(model, req, jsonSchema));
    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      lastErr = "model returned invalid JSON";
      continue;
    }
    const parsed = req.schema.safeParse(json);
    if (!parsed.success) {
      lastErr = parsed.error.message;
      continue;
    }
    const durationMs = Date.now() - started;
    if (mode === "readwrite") {
      const row = { model, task: req.task, output: JSON.stringify(parsed.data), durationMs };
      await db.aiCache.upsert({ where: { key }, create: { key, ...row }, update: row });
    }
    return { data: parsed.data, cached: false, durationMs, model };
  }
  throw new AiError(`AI output failed validation: ${lastErr.slice(0, 300)}`);
}

async function callOllama(model: string, req: Generate<z.ZodType>, format: unknown): Promise<string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.AI_TOKEN) headers.authorization = `Bearer ${process.env.AI_TOKEN}`;
  let res: Response;
  try {
    res = await fetch(`${env("AI_BASE_URL", "http://localhost:11434")}/api/chat`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(Number(env("AI_TIMEOUT_MS", "600000"))),
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        keep_alive: -1,
        format,
        options: { temperature: 0, num_ctx: Number(env("AI_NUM_CTX", "8192")) },
        messages: [
          { role: "system", content: req.system },
          {
            role: "user",
            content: req.prompt,
            ...(req.images?.length && { images: req.images.map((i) => Buffer.from(i).toString("base64")) }),
          },
        ],
      }),
    });
  } catch (e) {
    throw new AiError(`AI server unreachable at ${env("AI_BASE_URL", "")}: ${(e as Error).message}`);
  }
  const body = (await res.json().catch(() => ({}))) as { message?: { content?: string }; error?: string };
  if (!res.ok || body.error) throw new AiError(`AI server error: ${body.error ?? res.status}`);
  return body.message?.content ?? "";
}

export async function aiStatus() {
  const base = env("AI_BASE_URL", "http://localhost:11434");
  try {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const { models } = (await res.json()) as { models: { name: string }[] };
    const names = models.map((m) => m.name);
    return {
      online: true,
      base,
      models: (["fast", "smart"] as const).map((t) => ({ tier: t, name: modelFor(t), installed: names.includes(modelFor(t)) })),
    };
  } catch {
    return { online: false, base, models: [] };
  }
}
