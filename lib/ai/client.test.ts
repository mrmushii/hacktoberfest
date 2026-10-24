import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod/v4";

const schema = z.object({ room: z.string() });
const req = { task: "t@1", tier: "fast" as const, schema, system: "Extract.", prompt: "Room 501" };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers });

beforeEach(() => {
  vi.resetModules();
  Object.assign(process.env, { AI_PROVIDERS: "groq,gemini", GROQ_API_KEY: "g", GEMINI_API_KEY: "k", CACHE_MODE: "off", GROQ_RPM: "6000", GEMINI_RPM: "6000" });
});
afterEach(() => vi.unstubAllGlobals());

it("retries a 429 once, then falls back to Gemma and parses fenced JSON", async () => {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(new URL(url).host);
    if (url.includes("groq")) return json({ error: "slow down" }, 429, { "retry-after": "0.01" });
    return json({ candidates: [{ content: { parts: [{ text: 'thinking about {"room":"999"}', thought: true }, { text: '```json\n{"room":"501"}\n```' }] } }] });
  });
  const { generate } = await import("./client");
  const r = await generate(req);
  expect(r).toMatchObject({ data: { room: "501" }, provider: "gemini", model: "gemma-4-26b-a4b-it", cached: false });
  expect(calls).toEqual(["api.groq.com", "api.groq.com", "generativelanguage.googleapis.com"]);
});

it("uses the first provider when it answers", async () => {
  vi.stubGlobal("fetch", async () => json({ choices: [{ message: { content: '{"room":"402"}' } }] }));
  const { generate } = await import("./client");
  expect(await generate(req)).toMatchObject({ data: { room: "402" }, provider: "groq" });
});

it("errors instead of returning invalid or missing output", async () => {
  vi.stubGlobal("fetch", async (url: string) => (url.includes("groq") ? json({ choices: [{ message: { content: '{"wrong":1}' } }] }) : json({ error: "down" }, 500)));
  const { generate, AiError } = await import("./client");
  await expect(generate(req)).rejects.toBeInstanceOf(AiError);
});

it("skips image-only requests on text-only providers", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const { generate } = await import("./client");
  await expect(generate({ ...req, images: [new Uint8Array([1])], imageOnly: true })).rejects.toThrow(/can't read images/);
  expect(fetch).not.toHaveBeenCalled();
});

it("walks a long chain: OpenRouter and Hugging Face fall through to Cerebras", async () => {
  Object.assign(process.env, { AI_PROVIDERS: "openrouter,huggingface,cerebras", OPENROUTER_API_KEY: "o", HF_TOKEN: "h", CEREBRAS_API_KEY: "c", OPENROUTER_RPM: "6000", HF_RPM: "6000", CEREBRAS_RPM: "6000" });
  const hosts: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    hosts.push(new URL(url).host);
    if (url.includes("openrouter")) return json({ error: "no endpoints" }, 404);
    if (url.includes("huggingface")) return json({ choices: [{ message: { content: "Sure! Here it is: not json" } }] });
    expect(JSON.parse(String(init.body)).response_format).toEqual({ type: "json_object" });
    return json({ choices: [{ message: { content: '{"room":"602"}' } }] });
  });
  const { generate } = await import("./client");
  expect(await generate(req)).toMatchObject({ data: { room: "602" }, provider: "cerebras", model: "qwen-3.8-27b" });
  expect(hosts).toEqual(["openrouter.ai", "router.huggingface.co", "router.huggingface.co", "router.huggingface.co", "api.cerebras.ai"]);
});

it("ignores unknown names and providers without keys", async () => {
  Object.assign(process.env, { AI_PROVIDERS: "nope,openrouter", OPENROUTER_API_KEY: "" });
  const { generate } = await import("./client");
  await expect(generate(req)).rejects.toThrow(/No AI provider configured/);
});
