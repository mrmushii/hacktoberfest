import { aiStatus } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function Status() {
  const [s, cache] = await Promise.all([aiStatus(), db.aiCache.groupBy({ by: ["task"], _count: true, _avg: { durationMs: true } })]);
  return (
    <>
      <PageTitle title="AI status" sub="All inference runs on open-weight models through Ollama — local or self-hosted. No third-party API." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2 font-medium">
            Inference server <Badge tone={s.online ? "green" : "red"}>{s.online ? "online" : "unreachable"}</Badge>
          </div>
          <p className="mb-3 font-mono text-xs text-muted">{s.base}</p>
          {s.models.map((m) => (
            <div key={m.tier} className="flex justify-between border-t border-line py-2 text-sm">
              <span>{m.tier === "fast" ? "Fast tier (extraction)" : "Smart tier (reasoning)"}</span>
              <span className="font-mono">
                {m.name} {m.installed ? "✓" : <Badge tone="red">not installed</Badge>}
              </span>
            </div>
          ))}
        </Card>
        <Card>
          <div className="mb-3 font-medium">Result cache · mode {process.env.CACHE_MODE ?? "readwrite"}</div>
          {cache.length === 0 && <p className="text-sm text-muted">Empty. Run <code>npm run prewarm</code>.</p>}
          {cache.map((c) => (
            <div key={c.task} className="flex justify-between border-t border-line py-2 text-sm">
              <span className="font-mono text-xs">{c.task}</span>
              <span className="text-muted">
                {c._count} results · avg {Math.round((c._avg.durationMs ?? 0) / 1000)}s live
              </span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
