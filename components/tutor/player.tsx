"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward, X } from "lucide-react";
import { Quiz } from "@/components/quiz";
import { VoiceOrb } from "@/components/voice-orb";
import { PRESETS } from "@/lib/tutor/demo";
import type { Lesson } from "@/lib/tutor/lesson";
import { cancelSpeech, speak } from "@/lib/voice";
import { Board } from "./board";

const OP_COLOR: Record<string, string> = { insert: "bg-sky-400", search: "bg-amber-400", delete: "bg-rose-400" };
const opOf = (event: string) => event.split(/[ :]/)[0];
const SPEEDS = [0.75, 1, 1.25, 1.5];

/** Full-screen lesson: board, subtitles, scrubber, keyboard controls, voice Q&A, then the quiz. */
export function Player({ lesson, onClose, onTry }: { lesson: Lesson; onClose: () => void; onTry: (text: string) => void }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true); // autoplay
  const [speed, setSpeed] = useState(1);
  const [ended, setEnded] = useState(false);
  const run = useRef(0); // bumps on every pause/seek so a stale speak() never advances
  const last = lesson.steps.length - 1;
  const step = lesson.steps[i];

  useEffect(() => {
    if (!playing) return;
    const id = ++run.current;
    speak(step.say, speed).then(() => {
      if (run.current !== id) return;
      if (i < last) setI(i + 1);
      else {
        setPlaying(false);
        setEnded(true);
      }
    });
  }, [playing, i, step.say, speed, last]);

  const seek = useCallback(
    (n: number) => {
      run.current++;
      cancelSpeech();
      setPlaying(false);
      setEnded(false);
      setI(Math.max(0, Math.min(last, n)));
    },
    [last],
  );
  const toggle = useCallback(() => {
    if (playing) return seek(i);
    if (i === last) setI(0);
    setEnded(false);
    setPlaying(true);
  }, [playing, i, last, seek]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === " ") {
        e.preventDefault();
        toggle();
      }
      else if (e.key === "ArrowRight") seek(i + 1);
      else if (e.key === "ArrowLeft") seek(i - 1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      cancelSpeech();
    };
  }, [toggle, seek, i, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100" role="dialog" aria-modal aria-label={lesson.title}>
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{lesson.title}</div>
          <div className="text-xs text-zinc-400">Step {i + 1} of {lesson.steps.length} · space play/pause · ←/→ step · esc close</div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Close lesson"><X size={20} /></button>
      </div>

      <div className="relative min-h-0 flex-1">
        <Board state={step} dark />
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-4">
          <p key={i} className="max-w-3xl animate-[fadein_.35s_ease] rounded-2xl bg-black/75 px-5 py-3 text-center text-lg leading-snug shadow-2xl backdrop-blur" aria-live="polite">
            {step.say}
          </p>
        </div>
        {ended && (
          <div className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 text-zinc-900 shadow-2xl">
              <h2 className="text-xl font-semibold">Quick check</h2>
              <div className="mt-4"><Quiz questions={lesson.quiz} /></div>
              <h3 className="mt-6 text-sm font-semibold">Try another</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p.label} onClick={() => onTry(p.text)} className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100">{p.label}</button>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                <button className="btn-ghost" onClick={() => (seek(0), setPlaying(true))}><RotateCcw size={16} /> Replay</button>
                <button className="btn-primary ml-auto" onClick={onClose}>Done</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-5 py-3">
        <div className="mb-3 flex h-3 gap-0.5" role="group" aria-label="Lesson steps">
          {lesson.steps.map((s, n) => (
            <button key={n} onClick={() => seek(n)} title={s.event} aria-label={`Step ${n + 1}: ${s.event}`} className={`flex-1 rounded-sm transition ${OP_COLOR[opOf(s.event)] ?? "bg-violet-400"} ${n === i ? "scale-y-150 opacity-100" : n < i ? "opacity-70" : "opacity-25 hover:opacity-50"}`} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-full p-2 hover:bg-white/10" onClick={() => seek(i - 1)} aria-label="Previous step"><SkipBack size={18} /></button>
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white text-zinc-900" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
          <button className="rounded-full p-2 hover:bg-white/10" onClick={() => seek(i + 1)} aria-label="Next step"><SkipForward size={18} /></button>
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-full bg-white/10 px-3 py-1.5 text-sm" aria-label="Narration speed">
            {SPEEDS.map((s) => <option key={s} value={s} className="text-zinc-900">{s}×</option>)}
          </select>
          <span className="hidden font-mono text-xs text-zinc-400 md:inline">{step.event}</span>
          <VoiceOrb
            className="ml-auto max-w-xs"
            label="Ask the tutor"
            onStart={() => seek(i)}
            prompt={() => ({
              system: `You are a friendly computer-science tutor on a live voice call. The student is watching a binary search tree lesson and has paused at step ${i + 1}. Answer their questions briefly (2-4 spoken sentences), using only these facts:\n${lesson.steps.map((s, n) => `${n + 1}. ${s.event}`).join("\n")}\nCurrent step: ${step.event}. Ask if it makes sense before moving on.`,
              firstMessage: "What would you like me to explain about this step?",
            })}
          />
        </div>
      </div>
    </div>
  );
}
