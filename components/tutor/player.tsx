"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { Quiz } from "@/components/quiz";
import { Card } from "@/components/ui";
import type { Lesson } from "@/lib/tutor/lesson";
import { speak, startVoice, stopVoice, voiceConfigured, voiceLive } from "@/lib/tutor/voice";
import { Board } from "./board";

export function Player({ lesson, lang }: { lesson: Lesson; lang: "en" | "bn" }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState(false);
  const run = useRef(0); // bumps on every pause/seek so a stale speak() never advances
  const step = lesson.steps[i];
  const finished = i === lesson.steps.length - 1 && !playing;

  useEffect(() => () => stopVoice(), []);
  useEffect(() => {
    if (!playing) return;
    const id = ++run.current;
    speak(step.say, lang).then(() => {
      if (run.current !== id) return;
      if (i < lesson.steps.length - 1) setI(i + 1);
      else setPlaying(false);
    });
  }, [playing, i, step.say, lang, lesson.steps.length]);

  const seek = (n: number) => {
    run.current++;
    globalThis.speechSynthesis?.cancel();
    setPlaying(false);
    setI(Math.max(0, Math.min(lesson.steps.length - 1, n)));
  };
  const toggleVoice = async () => {
    if (voice) return stopVoice(), setVoice(false);
    setVoice(await startVoice(lesson));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card className="h-[60vh] overflow-hidden p-0">
        <Board state={step} />
      </Card>
      <div className="grid content-start gap-4">
        <Card>
          <div className="text-xs text-muted">
            Step {i + 1} / {lesson.steps.length}
          </div>
          <h2 className="mt-1 font-semibold">{lesson.title}</h2>
          <p className="mt-3 text-sm leading-relaxed">{step.say}</p>
          <p className="mt-2 font-mono text-xs text-muted">{step.event}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => seek(i - 1)} aria-label="Previous step"><SkipBack size={16} /></button>
            <button className="btn-primary" onClick={() => (playing ? seek(i) : (finished && setI(0), setPlaying(true)))} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="btn-ghost" onClick={() => seek(i + 1)} aria-label="Next step"><SkipForward size={16} /></button>
            <button className="btn-ghost" onClick={() => (seek(0), setPlaying(true))} aria-label="Replay"><RotateCcw size={16} /></button>
            {voiceConfigured() && (
              <button className="btn-ghost" onClick={toggleVoice} title="Talk to the tutor (Vapi)">
                {voice && voiceLive() ? <MicOff size={16} /> : <Mic size={16} />} {voice ? "End voice" : "Voice tutor"}
              </button>
            )}
          </div>
        </Card>
        {finished && lesson.quiz.length > 0 && (
          <Card>
            <h3 className="mb-3 font-semibold">Quick check</h3>
            <Quiz questions={lesson.quiz} />
          </Card>
        )}
      </div>
    </div>
  );
}
