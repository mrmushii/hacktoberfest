import { z } from "zod/v4";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/hash";
import { inLane, providerChain, RateLimited, type Provider } from "./providers";

export type Tier = "fast" | "smart";

export class AiError extends Error {}

export type AiResult<T> = { data: T; cached: boolean; durationMs: number; model: string; provider: string };

const env = (k: string, d: string) => process.env[k] ?? d;

type Generate<S extends z.ZodType> = {
  task: string; // also the prompt version, e.g. "notice.extract@1"
  tier: Tier;
  schema: S;
  system: string;
  prompt: string;
  images?: Uint8Array[]; // only sent to providers that accept images
  imageOnly?: boolean; // the prompt has no usable text without the image
};

const cacheKey = (model: string, req: Generate<z.ZodType>, images: Uint8Array[]) => sha256(model, req.task, req.system, req.prompt, ...images);

/**
 * Structured generation across the configured provider chain.
 * Cache first (for every provider's model), then each provider in order; 429s wait briefly, retry once,
 * then fall through. Only schema-valid output is returned or cached — otherwise a clear AiError.
 */
export async function generate<S extends z.ZodType>(req: Generate<S>): Promise<AiResult<z.infer<S>>> {
  const mode = env("CACHE_MODE", "readwrite");
  const chain = providerChain().filter((p) => p.configured);
  if (!chain.length) throw new AiError("No AI provider configured. Set AI_PROVIDERS and the matching API keys in .env.");
  const imagesFor = (p: Provider) => (p.supportsImages ? (req.images ?? []) : []);

  if (mode !== "off") {
    for (const p of chain) {
      const model = p.model(req.tier);
      const hit = await db.aiCache.findUnique({ where: { key: cacheKey(model, req, imagesFor(p)) } });
      if (!hit) continue;
      const parsed = req.schema.safeParse(JSON.parse(hit.output));
      if (parsed.success) return { data: parsed.data, cached: true, durationMs: hit.durationMs, model, provider: p.name };
    }
  }

  const jsonSchema = z.toJSONSchema(req.schema);
  const timeoutMs = Number(env("AI_TIMEOUT_MS", "600000"));
  const failures: string[] = [];
  for (const p of chain) {
    const model = p.model(req.tier);
    const images = imagesFor(p);
    if (req.imageOnly && !images.length) {
      failures.push(`${p.name}: needs text (this provider can't read images)`);
      continue;
    }
    const started = Date.now();
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        let content: string;
        try {
          content = await inLane(p, () => p.call(model, { system: req.system, prompt: req.prompt, images, jsonSchema, timeoutMs }));
        } catch (e) {
          if (e instanceof RateLimited && attempt === 0 && e.retryAfterMs <= 10000) {
            await new Promise((r) => setTimeout(r, e.retryAfterMs));
            continue;
          }
          throw e;
        }
        let json: unknown;
        try {
          json = JSON.parse(content);
        } catch {
          failures.push(`${p.name}: invalid JSON`);
          continue;
        }
        const parsed = req.schema.safeParse(json);
        if (!parsed.success) {
          failures.push(`${p.name}: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
          continue;
        }
        const durationMs = Date.now() - started;
        if (mode === "readwrite") {
          const key = cacheKey(model, req, images);
          const row = { model, task: req.task, output: JSON.stringify(parsed.data), durationMs };
          await db.aiCache.upsert({ where: { key }, create: { key, ...row }, update: row });
        }
        return { data: parsed.data, cached: false, durationMs, model, provider: p.name };
      }
    } catch (e) {
      failures.push(`${p.name}: ${(e as Error).message}`);
    }
  }
  throw new AiError(`AI unavailable — ${failures.join("; ").slice(0, 400)}`);
}

export async function aiStatus() {
  const chain = providerChain();
  return Promise.all(
    chain.map(async (p) => {
      const models = (["fast", "smart"] as const).map((tier) => ({ tier, name: p.model(tier) }));
      if (p.name !== "ollama") return { provider: p.name, online: p.configured, detail: p.configured ? "API key set" : "API key missing", models };
      const base = env("AI_BASE_URL", "http://localhost:11434");
      try {
        const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
        const names = ((await res.json()) as { models: { name: string }[] }).models.map((m) => m.name);
        const missing = models.filter((m) => !names.includes(m.name)).map((m) => m.name);
        return { provider: p.name, online: missing.length === 0, detail: missing.length ? `not installed: ${missing.join(", ")}` : base, models };
      } catch {
        return { provider: p.name, online: false, detail: `unreachable at ${base}`, models };
      }
    }),
  );
}
