"use client";

import type Vapi from "@vapi-ai/web";

// Only the public web key is used in the browser. The assistant is defined here (transient), so prompts live in code.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const MODEL = process.env.NEXT_PUBLIC_VAPI_MODEL || "llama-3.3-70b-versatile"; // open-weight, served by Groq through Vapi

export type Line = { role: "user" | "assistant"; text: string };
export type VoiceState = { status: "idle" | "connecting" | "live"; speaking: boolean; volume: number; caption: string; muted: boolean };

let vapi: Vapi | null = null;
let state: VoiceState = { status: "idle", speaking: false, volume: 0, caption: "", muted: false };
let transcript: Line[] = [];
let onEnd: ((lines: Line[]) => void) | null = null;
const listeners = new Set<(s: VoiceState) => void>();
const set = (patch: Partial<VoiceState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
};

export const voiceConfigured = () => Boolean(PUBLIC_KEY);
export const voiceState = () => state;
export function onVoice(cb: (s: VoiceState) => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

async function client() {
  if (vapi) return vapi;
  const { default: V } = await import("@vapi-ai/web");
  const v = new V(PUBLIC_KEY!);
  v.on("call-start", () => set({ status: "live" }));
  v.on("call-end", () => {
    set({ status: "idle", speaking: false, volume: 0, muted: false });
    const cb = onEnd;
    onEnd = null;
    cb?.(transcript);
  });
  v.on("error", () => set({ status: "idle", speaking: false, volume: 0 }));
  v.on("speech-start", () => set({ speaking: true }));
  v.on("speech-end", () => set({ speaking: false }));
  v.on("volume-level", (volume) => set({ volume }));
  v.on("message", (m: { type?: string; transcriptType?: string; role?: string; transcript?: string }) => {
    if (m.type !== "transcript" || !m.transcript) return;
    set({ caption: m.transcript });
    if (m.transcriptType === "final") transcript.push({ role: m.role === "user" ? "user" : "assistant", text: m.transcript });
  });
  return (vapi = v);
}

/** Starts a voice conversation. `end` receives the full transcript when the call finishes. false = voice unavailable. */
export async function startCall(opts: { system: string; firstMessage: string; end?: (lines: Line[]) => void }): Promise<boolean> {
  if (!voiceConfigured() || state.status !== "idle") return false;
  set({ status: "connecting", caption: "" });
  transcript = [];
  onEnd = opts.end ?? null;
  try {
    const v = await client();
    const call = await v.start({
      model: { provider: "groq", model: MODEL as "llama-3.3-70b-versatile", messages: [{ role: "system", content: opts.system }], temperature: 0.4 },
      voice: { provider: "vapi", voiceId: "Elliot" },
      transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
      firstMessage: opts.firstMessage,
    });
    if (!call) throw new Error("no call");
    return true;
  } catch {
    onEnd = null;
    set({ status: "idle" });
    return false;
  }
}

export function stopCall() {
  if (state.status !== "idle") vapi?.stop();
  globalThis.speechSynthesis?.cancel();
}

export function setMuted(muted: boolean) {
  vapi?.setMuted(muted);
  set({ muted });
}

/** Resolves when the line has been spoken (or a length-based timeout, so playback never hangs). Uses the call's voice when live. */
export function speak(text: string, rate = 1): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, (1500 + text.length * 80) / rate);
    const done = () => (clearTimeout(timer), resolve());
    if (state.status === "live" && vapi) {
      vapi.once("speech-end", done);
      vapi.say(text);
      return;
    }
    const synth = globalThis.speechSynthesis;
    if (!synth) return done();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  });
}

export function cancelSpeech() {
  globalThis.speechSynthesis?.cancel();
}
