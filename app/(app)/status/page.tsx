import { aiStatus } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { Badge, Card, PageTitle } from "@/components/ui";

const LABEL = { ollama: "Ollama (local / self-hosted)", groq: "Groq", gemini: "Gemini API (Gemma)" } as const;

export default async function Status() {
  const [chain, cache] = await Promise.all([aiStatus(), db.aiCache.groupBy({ by: ["model", "task"], _count: true, _avg: { durationMs: true }, orderBy: { model: "asc" } })]);
  return (
    <>
      <PageTitle title="AI status" sub="Open-weight models only. Providers are tried in order; cached answers are used first." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 font-medium">Provider chain · AI_PROVIDERS={process.env.AI_PROVIDERS ?? "ollama"}</div>
          {chain.map((p, i) => (
            <div key={p.provider} className="border-t border-line py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>
                  {i + 1}. {LABEL[p.provider as keyof typeof LABEL]}
                </span>
                <Badge tone={p.online ? "green" : "red"}>{p.online ? "ready" : "unavailable"}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted">{p.detail}</div>
              <div className="mt-1 font-mono text-xs">
                fast: {p.models[0].name} · smart: {p.models[1].name}
              </div>
            </div>
          ))}
          <p className="border-t border-line pt-3 text-xs text-muted">If every provider fails, the app shows an error and never a made-up result.</p>
        </Card>
        <Card>
          <div className="mb-3 font-medium">Result cache · mode {process.env.CACHE_MODE ?? "readwrite"}</div>
          {cache.length === 0 && (
            <p className="text-sm text-muted">
              Empty. Run <code>npm run prewarm</code>.
            </p>
          )}
          {cache.map((c) => (
            <div key={c.model + c.task} className="flex justify-between gap-3 border-t border-line py-2 text-sm">
              <span className="font-mono text-xs">
                {c.task} <span className="text-muted">· {c.model}</span>
              </span>
              <span className="shrink-0 text-muted">
                {c._count} · avg {Math.round((c._avg.durationMs ?? 0) / 1000)}s
              </span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
