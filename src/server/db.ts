import { PrismaClient } from "@prisma/client";

// Mismo respaldo que scripts/vercel-build.sh: integraciones que no crean DATABASE_URL.
process.env.DATABASE_URL ||= process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = db;

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
