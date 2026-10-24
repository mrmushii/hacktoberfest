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
    return json({ candidates: [{ content: { parts: [{ text: '```json\n{"room":"501"}\n```' }] } }] });
  });
  const { generate } = await import("./client");
  const r = await generate(req);
  expect(r).toMatchObject({ data: { room: "501" }, provider: "gemini", model: "gemma-3-12b-it", cached: false });
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
