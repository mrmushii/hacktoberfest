"use client";

import type Vapi from "@vapi-ai/web";
import type { Lesson } from "./lesson";

// Only the public web key is ever used here; the private key stays out of the app.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

let vapi: Vapi | null = null;
let live = false;

export const voiceConfigured = () => Boolean(PUBLIC_KEY && ASSISTANT_ID);

/** Starts a Vapi call that knows this lesson, so the student can ask follow-ups aloud. false = use browser speech. */
export async function startVoice(lesson: Lesson): Promise<boolean> {
  if (!voiceConfigured()) return false;
  try {
    if (!vapi) {
      const { default: V } = await import("@vapi-ai/web");
      vapi = new V(PUBLIC_KEY!);
      vapi.on("call-end", () => (live = false));
      vapi.on("error", () => (live = false));
    }
    const lessonContext = `${lesson.title}\n${lesson.steps.map((s, i) => `${i + 1}. ${s.event}`).join("\n")}`;
    live = Boolean(await vapi.start(ASSISTANT_ID!, { variableValues: { lessonContext } }));
  } catch {
    live = false;
  }
  return live;
}

export function stopVoice() {
  if (live) vapi?.stop();
  live = false;
  globalThis.speechSynthesis?.cancel();
}

export const voiceLive = () => live;

/** Resolves when the line has been spoken (or a length-based timeout, so playback never hangs). */
export function speak(text: string, lang: "en" | "bn"): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 1500 + text.length * 90);
    const done = () => (clearTimeout(timer), resolve());
    if (live && vapi) {
      vapi.once("speech-end", done);
      vapi.say(text);
      return;
    }
    const synth = globalThis.speechSynthesis;
    if (!synth) return done();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "bn" ? "bn-BD" : "en-US";
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  });
}
