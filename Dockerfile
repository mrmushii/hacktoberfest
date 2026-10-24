# Single container for online judging: Next.js app + Ollama with the model baked in.
# Build:  docker build --build-arg MODEL=gemma4:e4b -t unihub .
# Run:    docker run --gpus all -p 3000:3000 unihub
FROM ollama/ollama:0.40.10 AS models
ARG MODEL=gemma4:e4b
ARG MODEL_FAST=gemma4:e2b
RUN ollama serve & sleep 5 && ollama pull ${MODEL_FAST} && ollama pull ${MODEL} && pkill ollama

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY scripts ./scripts
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM ollama/ollama:0.40.10
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*
ARG MODEL=gemma4:e4b
ARG MODEL_FAST=gemma4:e2b
COPY --from=models /root/.ollama /root/.ollama
WORKDIR /app
COPY --from=build /app ./
# dev.db ships with the pre-warmed AI cache and demo data.
ENV NODE_ENV=production DATABASE_URL=file:./dev.db AI_PROVIDERS=ollama AI_BASE_URL=http://127.0.0.1:11434 \
    MODEL_FAST=${MODEL_FAST} MODEL_SMART=${MODEL} CACHE_MODE=readwrite AI_NUM_CTX=8192 PORT=3000
EXPOSE 3000
ENTRYPOINT ["/bin/sh", "-c", "ollama serve & until curl -s localhost:11434 >/dev/null; do sleep 1; done; npx prisma db push --skip-generate && npm start"]
