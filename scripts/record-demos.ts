/**
 * Records the walkthrough video each tool's preview plays, into public/demos/<id>.webm.
 * Needs the app running with DEMO_LOGIN=true and a warm AI cache (npm run prewarm).
 *   npm run demos            # every tool with a demo
 *   npm run demos notices    # just one
 * A new tool gets a demo by adding its flow to DEMOS below and `demo` to its entry in lib/tools.ts.
 */
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { TOOLS } from "../lib/tools";

const BASE = process.env.DEMO_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "public/demos");
const size = { width: 1280, height: 800 };
const beat = (page: Page, ms = 1200) => page.waitForTimeout(ms);

const DEMOS: Record<string, (page: Page) => Promise<void>> = {
  notices: async (page) => {
    await page.goto(`${BASE}/notices`);
    await beat(page);
    await page.getByRole("link", { name: "Upload notice" }).click();
    await page.getByPlaceholder("Paste the notice text here").fill(await readFile("samples/revised/cse301-midterm-revised.txt", "utf8"));
    await beat(page, 800);
    await page.getByRole("button", { name: "Analyse notice" }).click();
    await page.getByRole("button", { name: /publish/i }).waitFor({ timeout: 60_000 });
    await page.mouse.wheel(0, 400);
    await beat(page, 2500); // stop before publishing so recording doesn't change the demo data
  },
  examgraph: async (page) => {
    await page.goto(`${BASE}/examgraph`);
    await beat(page);
    await page.locator('a[href^="/examgraph/"]').first().click();
    await page.waitForURL(/\/examgraph\/.+/);
    await beat(page, 1500);
    await page.mouse.wheel(0, 500);
    await beat(page, 2000);
  },
  planner: async (page) => {
    await page.goto(`${BASE}/planner`);
    await beat(page, 2000);
    await page.mouse.wheel(0, 400);
    await beat(page, 1500);
  },
  study: async (page) => {
    await page.goto(`${BASE}/study`);
    await beat(page);
    await page.getByRole("button", { name: "Summarise" }).click();
    await page.getByRole("button", { name: "Summarise" }).and(page.locator(":enabled")).waitFor({ timeout: 60_000 });
    await beat(page, 1500);
    await page.mouse.wheel(0, 500);
    await beat(page, 2000);
  },
  cover: async (page) => {
    await page.goto(`${BASE}/cover-page`);
    await beat(page);
    for (const b of await page.locator("main button.btn-ghost").all()) {
      await b.click();
      await beat(page, 900);
    }
    await beat(page, 1000);
  },
};

async function main() {
  const only = process.argv[2];
  const tools = TOOLS.filter((t) => t.demo && (!only || t.id === only));
  const missing = tools.filter((t) => !DEMOS[t.id]).map((t) => t.id);
  if (missing.length) throw new Error(`No demo flow for: ${missing.join(", ")}`);
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  // sign in once as a demo student, then reuse the session for every recording
  const login = await browser.newContext({ viewport: size });
  const lp = await login.newPage();
  await lp.goto(`${BASE}/login`);
  await lp.getByRole("button", { name: /Ayesha/ }).click();
  await lp.waitForURL(`${BASE}/`);
  const state = await login.storageState();
  await login.close();

  for (const t of tools) {
    const dir = path.join(OUT, `.tmp-${t.id}`);
    const ctx = await browser.newContext({ viewport: size, storageState: state, recordVideo: { dir, size } });
    const page = await ctx.newPage();
    try {
      await DEMOS[t.id](page);
    } finally {
      await ctx.close(); // flushes the video
    }
    await rename((await page.video()!.path())!, path.join(OUT, `${t.id}.webm`));
    await rm(dir, { recursive: true, force: true });
    console.log(`recorded ${t.id}`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
