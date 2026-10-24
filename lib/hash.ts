import { createHash } from "node:crypto";

export function sha256(...parts: (string | Uint8Array)[]): string {
  const h = createHash("sha256");
  for (const p of parts) h.update(p).update("\0");
  return h.digest("hex");
}
