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

## How it works
- `lib/ai/client.ts` holds the single Ollama client. It calls the model with a JSON schema, validates the reply with Zod and retries once. It queues requests (`AI_CONCURRENCY`) and caches results under a hash of model + prompt version + input. Only validated output is cached. If the model is unreachable, the UI shows an error and never a made-up result.
- In NoticePulse, the model only extracts fields. The code then normalises dates, times and rooms (`normalize.ts`), finds the earlier version deterministically (`match.ts`) and diffs field by field (`diff.ts`). A person confirms before anything is published. Publishing notifies only the target department, semester and sections, and updates their Planner.
- In ExamGraph, the model extracts questions and maps them to syllabus topics with a confidence score. Students review low-confidence mappings. Frequencies are counted in code (`topicFrequency`): "appeared in 3 of 4 papers".
- The Study Assistant sends cited pages to the model (with simple keyword retrieval for Q&A). Every point links back to its source page.

## Online judging (laptop off)
Build the single container on any GPU host (RunPod, Vast, a cloud VM):
```bash
docker build --build-arg MODEL=gemma4:e4b --build-arg MODEL_FAST=gemma4:e2b -t unihub .
docker run --gpus all -p 3000:3000 unihub
docker exec <container> npm run prewarm   # cache is per model, so warm it on the server
```
The models are baked into the image, so the server never calls an outside API.
