import type { Tier } from "./client";

/** 429, or a transient 500/503: worth one short retry, then the next provider. */
export class RateLimited extends Error {
  constructor(public retryAfterMs: number, public status = 429) {
    super(status === 429 ? "rate limited" : `temporarily unavailable (${status})`);
  }
}

export type CallInput = { system: string; prompt: string; images?: Uint8Array[]; jsonSchema: object; timeoutMs: number };

export type Provider = {
  name: "ollama" | "groq" | "openrouter" | "huggingface" | "cerebras" | "gemini";
  model: (tier: Tier) => string;
  configured: boolean;
  supportsImages: boolean;
  concurrency: number;
  minIntervalMs: number; // spacing between requests, from the provider's requests-per-minute budget
  call: (model: string, input: CallInput) => Promise<string>;
};

const env = (k: string, d = "") => process.env[k] || d;
const rpm = (k: string, d: number) => Math.ceil(60000 / Number(env(k, String(d))));

async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number, who: string) {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    throw new Error(`${who} unreachable: ${(e as Error).message}`);
  }
  if (res.status === 429 || res.status === 500 || res.status === 503) {
    const after = Number(res.headers.get("retry-after"));
    throw new RateLimited(Number.isFinite(after) && after > 0 ? after * 1000 : 3000, res.status);
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`${who} error ${res.status}: ${JSON.stringify(json.error ?? json).slice(0, 200)}`);
  return json;
}

/** Hosted models get the schema in the prompt (they don't all accept a JSON schema parameter). */
const withSchema = (system: string, schema: object) =>
  `${system}\n\nRespond with a single JSON object (no prose, no code fences) matching this JSON Schema:\n${JSON.stringify(schema)}`;

/** Strip code fences or leading prose some models add around JSON. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const t = (fenced ? fenced[1] : text).trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  return start >= 0 && end > start ? t.slice(start, end + 1) : t;
}

const ollama: Provider = {
  name: "ollama",
  model: (t) => (t === "fast" ? env("MODEL_FAST", "qwen3.5:4b") : env("MODEL_SMART", "qwen3.5:4b")),
  configured: true,
  supportsImages: true,
  concurrency: Number(env("AI_CONCURRENCY", "1")),
  minIntervalMs: 0,
  async call(model, { system, prompt, images, jsonSchema, timeoutMs }) {
    const headers: Record<string, string> = process.env.AI_TOKEN ? { authorization: `Bearer ${process.env.AI_TOKEN}` } : {};
    const body = await post(
      `${env("AI_BASE_URL", "http://localhost:11434")}/api/chat`,
      headers,
      {
        model,
        stream: false,
        think: false,
        keep_alive: -1,
        format: jsonSchema,
        options: { temperature: 0, num_ctx: Number(env("AI_NUM_CTX", "8192")) },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt, ...(images?.length && { images: images.map((i) => Buffer.from(i).toString("base64")) }) },
        ],
      },
      timeoutMs,
      "Ollama",
    );
    return (body.message as { content?: string })?.content ?? "";
  },
};

type OpenAICompat = {
  name: Provider["name"];
  label: string;
  url: string;
  keyEnv: string;
  prefix: string; // env prefix for MODEL_FAST / MODEL_SMART / RPM
  fast: string;
  smart: string;
  rpm: number;
  jsonMode: boolean; // send response_format json_object (not every routed model accepts it)
  headers?: Record<string, string>;
};

/** Groq, OpenRouter, Hugging Face and Cerebras all speak the OpenAI chat-completions API. */
function openAICompatible(c: OpenAICompat): Provider {
  return {
    name: c.name,
    model: (t) => (t === "fast" ? env(`${c.prefix}_MODEL_FAST`, c.fast) : env(`${c.prefix}_MODEL_SMART`, c.smart)),
    configured: !!process.env[c.keyEnv],
    supportsImages: false,
    concurrency: 2,
    minIntervalMs: rpm(`${c.prefix}_RPM`, c.rpm),
    async call(model, { system, prompt, jsonSchema, timeoutMs }) {
      const body = await post(
        c.url,
        { authorization: `Bearer ${process.env[c.keyEnv]}`, ...c.headers },
        {
          model,
          temperature: 0,
          ...(c.jsonMode && { response_format: { type: "json_object" } }),
          messages: [
            { role: "system", content: withSchema(system, jsonSchema) },
            { role: "user", content: prompt },
          ],
        },
        timeoutMs,
        c.label,
      );
      return extractJson((body.choices as { message: { content: string } }[])?.[0]?.message?.content ?? "");
    },
  };
}

const groq = openAICompatible({
  name: "groq",
  label: "Groq",
  url: "https://api.groq.com/openai/v1/chat/completions",
  keyEnv: "GROQ_API_KEY",
  prefix: "GROQ",
  fast: "openai/gpt-oss-20b",
  smart: "openai/gpt-oss-120b",
  rpm: 30,
  jsonMode: true,
});

const openrouter = openAICompatible({
  name: "openrouter",
  label: "OpenRouter",
  url: "https://openrouter.ai/api/v1/chat/completions",
  keyEnv: "OPENROUTER_API_KEY",
  prefix: "OPENROUTER",
  fast: "google/gemma-4-26b-a4b-it:free",
  smart: "google/gemma-4-31b-it:free",
  rpm: 20,
  jsonMode: false,
  headers: { "X-Title": "UniHub AI" },
});

const huggingface = openAICompatible({
  name: "huggingface",
  label: "Hugging Face",
  url: "https://router.huggingface.co/v1/chat/completions",
  keyEnv: "HF_TOKEN",
  prefix: "HF",
  fast: "openai/gpt-oss-20b",
  smart: "Qwen/Qwen3-235B-A22B-Instruct-2507",
  rpm: 30,
  jsonMode: false,
});

const cerebras = openAICompatible({
  name: "cerebras",
  label: "Cerebras",
  url: "https://api.cerebras.ai/v1/chat/completions",
  keyEnv: "CEREBRAS_API_KEY",
  prefix: "CEREBRAS",
  fast: "qwen-3.8-27b",
  smart: "gpt-oss-120b",
  rpm: 30,
  jsonMode: true,
});

const gemini: Provider = {
  name: "gemini",
  model: (t) => (t === "fast" ? env("GEMINI_MODEL_FAST", "gemma-4-26b-a4b-it") : env("GEMINI_MODEL_SMART", "gemma-4-31b-it")),
  configured: !!process.env.GEMINI_API_KEY,
  supportsImages: false,
  concurrency: 1,
  minIntervalMs: rpm("GEMINI_RPM", 15),
  async call(model, { system, prompt, jsonSchema, timeoutMs }) {
    // Gemma on the Gemini API has no system role or JSON mode: fold both into the user turn.
    const body = await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { "x-goog-api-key": process.env.GEMINI_API_KEY! },
      { contents: [{ role: "user", parts: [{ text: `${withSchema(system, jsonSchema)}\n\n${prompt}` }] }], generationConfig: { temperature: 0 } },
      timeoutMs,
      "Gemini API",
    );
    // Gemma 4 returns its reasoning as separate parts flagged `thought`; keep only the answer.
    const parts = (body.candidates as { content?: { parts?: { text?: string; thought?: boolean }[] } }[])?.[0]?.content?.parts ?? [];
    return extractJson(parts.filter((p) => !p.thought).map((p) => p.text ?? "").join(""));
  },
};

const ALL = { ollama, groq, openrouter, huggingface, cerebras, gemini };

/** Provider chain from AI_PROVIDERS, e.g. "ollama" (offline) or "groq,cerebras,openrouter,huggingface,gemini" (online). */
export function providerChain(): Provider[] {
  return env("AI_PROVIDERS", "ollama")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is keyof typeof ALL => s in ALL)
    .map((s) => ALL[s]);
}

// Per-provider queue: bounded concurrency plus minimum spacing between request starts.
const lanes = new Map<string, { active: number; waiting: (() => void)[]; nextAt: number }>();
export async function inLane<T>(p: Provider, fn: () => Promise<T>): Promise<T> {
  const lane = lanes.get(p.name) ?? { active: 0, waiting: [], nextAt: 0 };
  lanes.set(p.name, lane);
  while (lane.active >= p.concurrency) await new Promise<void>((r) => lane.waiting.push(r));
  lane.active++;
  try {
    const wait = lane.nextAt - Date.now();
    lane.nextAt = Math.max(Date.now(), lane.nextAt) + p.minIntervalMs;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    return await fn();
  } finally {
    lane.active--;
    lane.waiting.shift()?.();
  }
}
