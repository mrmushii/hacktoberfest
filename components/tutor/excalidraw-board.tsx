"use client";

import { convertToExcalidrawElements, Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { useEffect, useState } from "react";
import { toElements } from "@/lib/tutor/layout";
import type { TreeState } from "@/lib/tutor/types";

export default function ExcalidrawBoard({ state, dark = false }: { state: TreeState | null; dark?: boolean }) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    if (!api) return;
    const elements = state ? convertToExcalidrawElements(toElements(state), { regenerateIds: false }) : [];
    api.updateScene({ elements });
    // Ease the camera to what the narration is about; whole tree when nothing is highlighted.
    const focus = state?.highlight.length ? elements.filter((e) => state.highlight.some((k) => e.id === `n${k}`)) : elements;
    // Next frame: on first paint the canvas has no size yet, so an immediate scroll lands off-screen.
    const t = setTimeout(() => api.scrollToContent(focus.length ? focus : elements, { fitToContent: !state?.highlight.length || focus.length > 1, animate: true, duration: 500 }), 60);
    return () => clearTimeout(t);
  }, [api, state]);

  // The first frame goes in as initialData: Excalidraw's own initial load would overwrite an early updateScene.
  const [initial] = useState(() => ({ elements: state ? convertToExcalidrawElements(toElements(state), { regenerateIds: false }) : [], scrollToContent: true }));
  return <Excalidraw initialData={initial} excalidrawAPI={setApi} theme={dark ? "dark" : "light"} zenModeEnabled viewModeEnabled UIOptions={{ canvasActions: { toggleTheme: false, export: false, loadScene: false, saveToActiveFile: false, saveAsImage: false } }} />;
}
