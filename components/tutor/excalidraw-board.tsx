"use client";

import { convertToExcalidrawElements, Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { useEffect, useState } from "react";
import { toElements } from "@/lib/tutor/layout";
import type { TreeState } from "@/lib/tutor/types";

export default function ExcalidrawBoard({ state }: { state: TreeState | null }) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    if (!api) return;
    api.updateScene({ elements: state ? convertToExcalidrawElements(toElements(state), { regenerateIds: false }) : [] });
    api.scrollToContent(undefined, { fitToContent: true, animate: true });
  }, [api, state]);

  return <Excalidraw excalidrawAPI={setApi} zenModeEnabled viewModeEnabled={false} />;
}
