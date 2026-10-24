// Picks the database for this build: SQLite locally and in Docker, Postgres when a postgres URL is configured
// (Vercel's Prisma Postgres integration sets DATA_DATABASE_URL). Prisma needs the provider fixed at generate time.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.DATA_DATABASE_URL || process.env.DATABASE_URL || "";
const postgres = /^postgres(ql)?:\/\//.test(url);
const schema = "prisma/schema.prisma";
if (postgres) writeFileSync(schema, readFileSync(schema, "utf8").replace('provider = "sqlite"', 'provider = "postgresql"'));

const run = (cmd) => execSync(cmd, { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
run("npx prisma generate");
// Create/update tables on the hosted database; refuses destructive changes.
if (postgres) {
  run("npx prisma db push --skip-generate");
  // First deploy only: seed demo users, courses and samples. Never runs once the database has users.
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: url });
  const empty = (await db.user.count()) === 0;
  await db.$disconnect();
  if (empty) run("npx tsx scripts/reset.ts");
}
console.log(`prisma: ${postgres ? "postgresql" : "sqlite"}`);
