"use client";

import { useEffect, useState } from "react";
import { Loader2, Mic, MicOff, PhoneOff } from "lucide-react";
import { onVoice, setMuted, startCall, stopCall, voiceConfigured, voiceState, type Line } from "@/lib/voice";

/** One mic button for talking to the AI. `prompt` is built when the call starts, so it sees the latest context. */
export function VoiceOrb({ label, prompt, onStart, onEnd, className = "" }: { label: string; prompt: () => { system: string; firstMessage: string } | Promise<{ system: string; firstMessage: string }>; onStart?: () => void; onEnd?: (lines: Line[]) => void; className?: string }) {
  const [s, setS] = useState(voiceState);
  const [err, setErr] = useState("");
  useEffect(() => onVoice(setS), []);
  useEffect(() => () => stopCall(), []);
  if (!voiceConfigured()) return null;

  const live = s.status === "live";
  const start = async () => {
    setErr("");
    onStart?.();
    try {
      if (!(await startCall({ ...(await prompt()), end: onEnd }))) setErr("Couldn't start voice. Check microphone permission.");
    } catch {
      setErr("Couldn't prepare the voice chat.");
    }
  };
  const ring = live ? 1 + Math.min(1, s.volume * 3) * 0.6 : 1;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative grid h-14 w-14 shrink-0 place-items-center">
        <span aria-hidden className={`absolute inset-0 rounded-full ${live ? "bg-accent/25" : "bg-transparent"} transition-transform duration-100`} style={{ transform: `scale(${ring})` }} />
        <button
          onClick={live ? stopCall : start}
          disabled={s.status === "connecting"}
          aria-label={live ? "End voice chat" : label}
          className={`relative grid h-12 w-12 place-items-center rounded-full text-white shadow-lg transition ${live ? "bg-red-500 hover:bg-red-600" : "bg-accent hover:scale-105"}`}
        >
          {s.status === "connecting" ? <Loader2 size={20} className="animate-spin" /> : live ? <PhoneOff size={20} /> : <Mic size={20} />}
        </button>
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium">{live ? (s.speaking ? "Speaking…" : s.muted ? "Muted" : "Listening…") : s.status === "connecting" ? "Connecting…" : label}</div>
        <div className="truncate text-xs text-muted" aria-live="polite">{err || (live ? s.caption || "Say what you're stuck on" : "Voice chat · tap to talk")}</div>
      </div>
      {live && (
        <button onClick={() => setMuted(!s.muted)} className="btn-ghost" aria-label={s.muted ? "Unmute" : "Mute"}>
          {s.muted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      )}
    </div>
  );
}
