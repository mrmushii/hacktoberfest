"use client";

import dynamic from "next/dynamic";

// Excalidraw touches window at import time, so it only ever loads in the browser.
export const Board = dynamic(() => import("./excalidraw-board"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-zinc-500">Loading board…</div> });
