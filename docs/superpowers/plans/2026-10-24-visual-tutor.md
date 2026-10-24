# Visual Tutor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new UniHub tool, "Visual Tutor". A student types, photographs or uploads a BST problem (for example "insert 50, 30, 70, 20, 40 and search for 40"). The app reads it with the existing OCR and PDF tools, makes one LLM call for the words, computes the correct tree states in code, plays them step by step on an Excalidraw board with narration, and ends with a short quiz.

**Architecture:** This is a TypeScript-only addition to the existing Next.js app, with no Python service. The pipeline is: input (text / `ocrImage()` / `unpdf`), then `lib/tutor/parse.ts` (a deterministic op parser, with an LLM fallback), then `lib/tutor/bst.ts` (pure engine producing `TreeState[]`), then a single `generate()` call that returns narration, one line per step, plus a quiz. The result is a `Lesson`, which `LessonPlayer` plays on Excalidraw. Voice is an adapter: Vapi (`@vapi-ai/web`, `vapi.say()` per step) when `NEXT_PUBLIC_VAPI_PUBLIC_KEY` is set, and browser `speechSynthesis` otherwise. The LLM never decides tree structure. It only writes words for the steps the engine produced.

**Tech Stack:** Next.js 15 / React 19, `@excalidraw/excalidraw`, zod/v4, the existing `generate()` (cache + open-weight provider chain), tesseract.js (eng+ben), unpdf, vitest, `@vapi-ai/web`.

**Spec:** this conversation (2026-10-24): Excalidraw board, deterministic algorithm engine, a single LLM call, local parsing/OCR tools, Vapi voice. BST only in v1.

## Global Constraints

- Models: open-weight only, through `generate()` in `lib/ai/client.ts`. Do not call any provider directly.
- Every LLM call goes through a zod schema and has a versioned `task` id (`"tutor.lesson@1"`). Bump the version whenever the prompt changes, then re-run `npm run prewarm`.
- 8 GB RAM: OCR runs in the browser before the request, so OCR and the model never run at the same time on the server.
- The Vapi **private** key is never used or shipped. Only `NEXT_PUBLIC_VAPI_PUBLIC_KEY` (the public web key) and `NEXT_PUBLIC_VAPI_ASSISTANT_ID` are used. When either is missing, voice falls back to `speechSynthesis` with no error.
- **Blocking decision before Task 6:** ask the organizers whether Vapi's speech-to-text and voice models are allowed under the open-weight rule. If they aren't, skip Task 6. The fallback is already the default.
- The tutor must work offline for the demo. The demo lesson is pre-warmed, so it comes from cache.
- Keys allowed in a problem: integers from -999 to 999. At most 15 operations per lesson.

## Review Focus

1. Duplicate insert (`insert 30` twice): the tree is unchanged and the step says "30 already exists". Tested in Task 2.
2. Delete of a node with two children: the in-order successor replaces it. Tested in Task 2.
3. Messy OCR text (`Insert: 50,30 ,70; search 4O`): the parser accepts flexible separators, fixes the O→0 OCR confusion inside numbers, and reports tokens it can't read instead of guessing. Tested in Task 3.
4. LLM returns a different number of narration lines than there are steps: padded or trimmed to `steps.length`, so the player never goes out of range. Tested in Task 4.
5. Voice unavailable (no key, Vapi call fails, mic denied): playback continues with `speechSynthesis`, or silently if that's missing too. Tested in Task 6.

---

### Task 1: Excalidraw board with programmatic drawing

**Files:**
- Create: `lib/tutor/layout.ts`, `lib/tutor/layout.test.ts`
- Create: `components/tutor/board.tsx` (client-only, loaded via `next/dynamic` with `ssr: false`)
- Modify: `package.json` (add `@excalidraw/excalidraw`)

**Interfaces:**
- Produces: `type TreeNode = { key: number; left: TreeNode | null; right: TreeNode | null }`
- Produces: `layout(root: TreeNode | null): { key: number; x: number; y: number }[]`. In-order index × 80 gives x, depth × 100 gives y, so no two nodes overlap.
- Produces: `toElements(state: TreeState): ExcalidrawElementSkeleton[]`. Each key becomes an ellipse with its key as the label and id `n<key>`, each parent-child link becomes an arrow, and every node in `state.highlight` gets stroke `#e8590c`.
- Produces: `<Board state={TreeState | null} />`, which calls `api.updateScene({ elements: convertToExcalidrawElements(toElements(state)) })` whenever `state` changes, then `api.scrollToContent()`.

- [ ] **Step 1: Write failing tests** `layout places in-order left to right` (tree 50/30/70 gives x for 30 < 50 < 70 and y(30) = y(70) > y(50)) and `layout of empty tree is []`.
- [ ] **Step 2:** Run `npx vitest run lib/tutor/layout.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `layout` and `toElements` in `lib/tutor/layout.ts`, and `Board` in `components/tutor/board.tsx` (import `@excalidraw/excalidraw/index.css`).
- [ ] **Step 4:** Run the tests. Expected: PASS. Then run `npm run dev`, render `<Board>` with a fixed state on a scratch page, and confirm the nodes and arrows show and the board pans and zooms.
- [ ] **Step 5:** Commit `feat(tutor): excalidraw board and tree layout`.

### Task 2: Deterministic BST engine

**Files:**
- Create: `lib/tutor/bst.ts`, `lib/tutor/bst.test.ts`

**Interfaces:**
- Consumes: `TreeNode` (Task 1)
- Produces: `type Op = { kind: "insert" | "delete" | "search"; key: number } | { kind: "inorder" | "preorder" | "postorder" }`
- Produces: `type TreeState = { root: TreeNode | null; highlight: number[]; event: string }`. `event` is a short machine-written fact, such as `"compare 40 < 50, go left"` or `"insert 40 as right child of 30"`, and is the LLM's only source of facts.
- Produces: `run(ops: Op[]): TreeState[]`. Each op emits one state per comparison or visit, and the trees are immutable, so a new object is created per change.

- [ ] **Step 1: Write failing tests:**
  - `insert builds BST`: the inorder of the final root for `insert 50,30,70,20,40` is `[20,30,40,50,70]`.
  - `search emits path`: the highlights for `search 40` on that tree are `[50]`, `[50,30]`, `[50,30,40]`, and the last event contains `"found"`.
  - `search miss`: the last event for `search 99` contains `"not found"`.
  - `duplicate insert is a no-op`: the tree is unchanged and the event contains `"already exists"`.
  - `delete two-children uses successor`: after deleting 30, the inorder is `[20,40,50,70]` and the event names 40 as the successor.
  - `delete leaf` and `delete missing key`.
- [ ] **Step 2:** Run `npx vitest run lib/tutor/bst.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `run`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(tutor): deterministic BST engine`.

### Task 3: Problem parser (text, OCR, PDF → Op[])

**Files:**
- Create: `lib/tutor/parse.ts`, `lib/tutor/parse.test.ts`

**Interfaces:**
- Consumes: `Op` (Task 2), `generate` (`lib/ai/client.ts`)
- Produces: `parseOps(text: string): { ops: Op[]; unknown: string[] }`. Deterministic. Matches English verbs (insert/add, delete/remove, search/find, inorder/preorder/postorder traversal) and the Bangla verbs যোগ, মুছ and খোঁজ. Inside numeric tokens, `O`/`o` become `0` and `l`/`I` become `1`. Separators can be commas, semicolons, spaces or newlines.
- Produces: `async extractOps(text: string): Promise<Op[]>`. Uses `parseOps` first, and only when it finds 0 ops does it call `generate({ task: "tutor.ops@1", tier: "fast", schema: z.object({ ops: z.array(OpSchema).max(15) }), ... })`. Throws `TutorInputError` when nothing usable is found or there are more than 15 ops.

- [ ] **Step 1: Write failing tests:**
  - `parses comma list`: `"Insert 50, 30, 70 then search 40"` → 3 inserts + 1 search.
  - `ocr noise`: `"Insert: 50,30 ,70; search 4O"` gives the same ops.
  - `bangla verbs`: `"৫০, ৩০ যোগ করো"` gives inserts of 50 and 30, with Bangla digits converted.
  - `reports unknown tokens`: `"insert 50 frobnicate 3"` returns `unknown: ["frobnicate"]`.
  - `rejects more than 15 ops`.
- [ ] **Step 2:** Run `npx vitest run lib/tutor/parse.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. OCR and PDF extraction stay where they already are: the page calls `ocrImage()` (`lib/ocr.ts`) or the existing `unpdf` path in the browser or route, then passes the text here.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(tutor): op parser with OCR-noise tolerance`.

### Task 4: Lesson generation (one LLM call) and API route

**Files:**
- Create: `lib/tutor/lesson.ts`, `lib/tutor/lesson.test.ts`
- Create: `app/api/tutor/route.ts` (follows `app/api/study/route.ts`: `handle()`, `maxDuration = 600`)

**Interfaces:**
- Consumes: `run` (Task 2), `extractOps` (Task 3), `generate`
- Produces: `type Lesson = { title: string; ops: Op[]; steps: (TreeState & { say: string })[]; quiz: { question: string; options: string[]; answer: number; explanation: string }[] }`
- Produces: `async buildLesson(text: string, lang: "en" | "bn"): Promise<Lesson>`. Runs `extractOps`, then `run`, then `generate({ task: "tutor.lesson@1", tier: "smart", schema: { title, narration: string[], quiz: 3 items with 4 options each } })`. The prompt lists `steps[i].event` numbered and tells the model to write exactly one or two sentences per event, adding no facts that aren't in the events. `narration` is padded with the event text or trimmed to `steps.length`.
- Produces: `POST /api/tutor` with body `{ text: string; lang: "en" | "bn" }` and response `AiResult<Lesson>`.

- [ ] **Step 1: Write failing tests** (mock `generate` with `vi.mock("@/lib/ai/client")`):
  - `aligns narration to steps`: when the mock returns 2 lines for 6 steps, there are 6 `say` values, and the 3rd to 6th are the event strings.
  - `trims extra narration`.
  - `quiz answer index in range`: an out-of-range answer from the mock fails the schema, so `AiError` propagates.
- [ ] **Step 2:** Run `npx vitest run lib/tutor/lesson.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `buildLesson` and the route.
- [ ] **Step 4:** Run the tests. Expected: PASS. Then run `curl -XPOST localhost:3000/api/tutor -d '{"text":"insert 50,30,70,20,40 search 40","lang":"en"}'` with a logged-in cookie, and expect JSON with `steps.length` > 0.
- [ ] **Step 5:** Commit `feat(tutor): lesson generation route`.

### Task 5: Lesson page, player and tool registration

**Files:**
- Create: `app/(app)/tutor/page.tsx`, `app/(app)/tutor/tool.tsx` (same split as `app/(app)/study`)
- Create: `components/tutor/player.tsx`
- Modify: `lib/tools.ts` (add a `TOOLS` entry `{ id: "tutor", title: "Visual Tutor", category: "Study", href: "/tutor", size: "md", ... }`)
- Modify: `scripts/reset.ts` (prewarm `buildLesson(DEMO_TEXT, "en")` with `DEMO_TEXT = "insert 50, 30, 70, 20, 40, 60, 80; search 60; delete 30"`)

**Interfaces:**
- Consumes: `Lesson` (Task 4), `<Board>` (Task 1), `ocrImage` (`lib/ocr.ts`), `speak` (Task 6; until then, use a local `speechSynthesis` call)
- Produces: `<Player lesson={Lesson} />` with Play/Pause, Previous, Next and Replay controls. Pressing play shows `steps[i]` on the Board, shows `say` in the side panel, calls `await speak(say)`, then moves on. After the last step it shows the quiz with per-option feedback and the explanation.

- [ ] **Step 1:** Build the input form: a textarea, an image upload (`ocrImage`, showing confidence with a warning under 60), a PDF upload (existing unpdf path), an EN/বাংলা toggle, and a Generate button. Show `AiError` messages inline, the same way the Study tool does.
- [ ] **Step 2:** Build `Player` and connect it to the page.
- [ ] **Step 3:** Run `npm run prewarm`, then open `/tutor` and play the demo text. Expected: the lesson loads instantly (cached) and plays all steps, with the highlighted path matching the search.
- [ ] **Step 4:** Run `npm test && npm run lint`. Expected: all green.
- [ ] **Step 5:** Commit `feat(tutor): lesson page, player, prewarm`.

### Task 6: Voice adapter (Vapi with speechSynthesis fallback)

**Gate:** only start this after the organizers approve Vapi. Otherwise mark it skipped.

**Files:**
- Create: `lib/tutor/voice.ts`, `lib/tutor/voice.test.ts`
- Modify: `components/tutor/player.tsx` (use `speak`, add a "🎙 Ask a question" button)
- Modify: `package.json` (`@vapi-ai/web`), `.env.example` (add `NEXT_PUBLIC_VAPI_PUBLIC_KEY=""`, `NEXT_PUBLIC_VAPI_ASSISTANT_ID=""`)

**Interfaces:**
- Produces: `speak(text: string, lang: "en" | "bn"): Promise<void>`. If a Vapi call is active, `vapi.say(text)` runs and the promise resolves on the next `speech-end` event, with a timeout of `text.length * 90 ms`. Otherwise it uses `speechSynthesis` (`bn-BD` or `en-US` voice) and resolves on `onend`. If neither is available, it resolves right away.
- Produces: `startVoice(lesson: Lesson): Promise<boolean>`. Calls `vapi.start(ASSISTANT_ID, { variableValues: { lessonContext } })`, where `lessonContext` is the title plus the event list, so the assistant answers spoken follow-up questions about this lesson. It returns `false`, without throwing, when the keys are missing or the start fails.
- Produces: `stopVoice(): void`
- Vapi dashboard setup, by hand and not in code: create an assistant whose model is an **open-weight** one (for example, the Groq Llama or Qwen option in Vapi's model list) and whose system prompt contains `{{lessonContext}}`. The voice and STT choice depend on the organizers' answer.

- [ ] **Step 1: Write failing tests** (stub `window.speechSynthesis` and mock `@vapi-ai/web`):
  - `falls back without keys`: with no env set, `startVoice` returns false and `speak` uses `speechSynthesis`.
  - `falls back when vapi.start rejects`.
  - `speak resolves on timeout if speech-end never fires`.
- [ ] **Step 2:** Run `npx vitest run lib/tutor/voice.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement and connect it to `Player`. Call `stopVoice()` on unmount.
- [ ] **Step 4:** Run the tests. Expected: PASS. Then test by hand with the real public key: play the lesson, hear the Vapi voice, ask "why did 60 go right?" and get a relevant spoken answer.
- [ ] **Step 5:** Commit `feat(tutor): vapi voice with speechSynthesis fallback`.

---

**Later, not in this plan:** linked lists, stacks, sorting and graphs. Each one gets its own engine file that returns `TreeState`-like states and its own `toElements`, while the player and the lesson route are reused.
