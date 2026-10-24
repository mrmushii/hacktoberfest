/** Pages labelled for citation, trimmed to a character budget that fits the model context. */
export function pagesForPrompt(pages: string[], budget = 14000, pick?: number[]): string {
  const idx = pick ?? pages.map((_, i) => i);
  let out = "";
  for (const i of idx) {
    const block = `[page ${i + 1}]\n${pages[i]}\n\n`;
    if (out.length + block.length > budget) break;
    out += block;
  }
  return out;
}

/** Rank pages by keyword overlap with a query (cheap retrieval, no embeddings). */
export function rankPages(pages: string[], query: string, k = 4): number[] {
  const terms = [...new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])];
  return pages
    .map((p, i) => {
      const t = p.toLowerCase();
      return { i, score: terms.reduce((s, w) => s + (t.split(w).length - 1), 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.i)
    .sort((a, b) => a - b);
}
