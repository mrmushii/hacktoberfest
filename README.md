# UniHub AI

One student workspace: an AI Notice Board with version diffs (NoticePulse), past-paper topic analysis (ExamGraph), a grounded Study Assistant, a Planner and a Cover Page designer. All AI runs on **open-weight models through Ollama**. There are no third-party APIs, no keys and no rate limits.

## Run locally (offline)
```bash
npm install
npx prisma db push
npm run prewarm      # runs every sample through the model once and caches the results
npm run dev          # http://localhost:3000
```
Ollama must be running with the models named in `.env` (`MODEL_FAST`, `MODEL_SMART`).
On this 8 GB dev machine we use `qwen3.5:4b`. On a 16 GB+ machine or GPU server, set them to `gemma4:e2b` / `gemma4:e4b`.

- `npm run reset`: restores the demo data. The AI cache is kept, so the reset takes seconds.
- `npm test`: runs the unit tests for normalisation, diffing, matching and topic frequency.
- `CACHE_MODE=off|read|readwrite`: `off` forces live inference.

## Sign-in
- **Google:** in Google Cloud Console → APIs & Services → Credentials, create an *OAuth client ID* (Web). Add the redirect URI `http://localhost:3000/api/auth/callback/google` (plus your server's URL for online judging). Put the ID and secret in `.env` as `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`. Any Google account can sign in.
- **Offline demo:** `DEMO_LOGIN=true` adds one-click demo students (Ayesha CSE-5A, Tanvir CSE-5B, Nusrat EEE-3A) and a "New student" button that runs the onboarding wizard. Set it to `false` for a public deployment.
- New users complete a 7-step profile setup. After that, Home is a bento grid of tools with search and filters. The avatar menu (top right) has Profile, Settings, AI status and Sign out. The "Viewing" switch shows another department's notices and courses, while your notifications stay tied to your own profile.

## How it works
- `lib/ai/client.ts` holds the single Ollama client. It calls the model with a JSON schema, validates the reply with Zod and retries once. It queues requests (`AI_CONCURRENCY`) and caches results under a hash of model + prompt version + input. Only validated output is cached. If the model is unreachable, the UI shows an error and never a made-up result.
- In NoticePulse, the model only extracts fields. The code then normalises dates, times and rooms (`normalize.ts`), finds the earlier version deterministically (`match.ts`) and diffs field by field (`diff.ts`). A person confirms before anything is published. Publishing notifies only the target department, semester and sections, and updates their Planner.
- In ExamGraph, the model extracts questions and maps them to syllabus topics with a confidence score. Students review low-confidence mappings. Frequencies are counted in code (`topicFrequency`): "appeared in 3 of 4 papers".
- The Study Assistant sends cited pages to the model (with simple keyword retrieval for Q&A). Every point links back to its source page.

## AI providers
All models are open-weight. `AI_PROVIDERS` picks the chain (see the two profiles in `.env.example`):
- **Local / offline:** `AI_PROVIDERS=ollama` runs `qwen3.5:4b` (or Gemma on bigger machines) on this computer. No internet needed.
- **Online judging:** `AI_PROVIDERS=groq,gemini` tries Groq (`gpt-oss`) first, then Gemma via the Gemini API. If both fail, the app shows a clear error, never a made-up result. API keys stay in the server-side `.env`; the browser never sees them.

Rate-limit protection, all in [lib/ai/client.ts](lib/ai/client.ts) and [lib/ai/providers.ts](lib/ai/providers.ts):
1. The cache is checked for every provider's model before any API call.
2. A server-side queue per provider limits concurrent requests and spaces them to stay under `GROQ_RPM` / `GEMINI_RPM`.
3. On a 429 it waits for the provider's `retry-after` (up to 10 s), retries once, then moves to the next provider.
4. Prompts carry only the relevant pages (keyword-ranked) and stay within about 12k characters.

The AI badge and the AI status page show which provider and model answered.

## Photo notices (OCR)
On the upload page, photos are read **in the browser** with tesseract.js (English + Bangla). The worker, WASM core and language files sit in `public/tesseract/` (copied on `npm install`), so OCR works offline. The OCR text is sent with the image:
- Text-only online models work from the OCR text. Ollama vision models also see the image and can correct OCR mistakes.
- Below 70% OCR confidence, every extracted fact is marked **uncertain** for review.
- Date checking (`verifyDates`) also runs against the OCR text.

## Deploying for online judging (laptop off)
**No GPU needed** with the Groq/Gemini profile:
```bash
cp .env.example .env.online   # switch to profile 2, add GROQ_API_KEY and GEMINI_API_KEY, set DEMO_LOGIN as you want
docker build -f Dockerfile.online -t unihub-online .
docker run -d -p 3000:3000 --env-file .env.online -v unihub-data:/app/data unihub-online
docker exec <container> npm run prewarm   # IMPORTANT: the cache is per model, so warm it on the server
```
Any small VM or container host works (Render, Railway, Fly.io, a $5 VPS). The volume keeps the SQLite database and the AI cache across restarts. Prewarm makes the demo instant and avoids using up API quota during judging.

For a self-hosted GPU server instead, the original `Dockerfile` bundles Ollama with Gemma E2B/E4B.
