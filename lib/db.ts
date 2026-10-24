import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };
// DATA_DATABASE_URL comes from Vercel's Prisma Postgres integration; locally DATABASE_URL (SQLite) is used.
export const db = g.prisma ?? new PrismaClient({ datasourceUrl: process.env.DATA_DATABASE_URL || process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") g.prisma = db;
