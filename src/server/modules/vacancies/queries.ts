import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { authorize, type Actor } from "@/server/auth/permissions";
import { AppError } from "@/server/lib/result";
import { computeAging, loadAgingContext } from "@/server/modules/reports/aging";
import { vacancyFiltersSchema } from "./schemas";

/** Alcance de lectura por rol: Marketing solo ve plazas públicas. */
function scopeWhere(actor: Actor): Prisma.VacancyWhereInput {
  return actor.role === "MARKETING" ? { visibility: "PUBLIC" } : {};
}

export async function listVacancies(actor: Actor, rawFilters: unknown) {
  authorize(actor, "vacancy.read");
  const f = vacancyFiltersSchema.parse(rawFilters);
  const where: Prisma.VacancyWhereInput = {
    ...scopeWhere(actor),
    status: f.status ?? { not: "ARCHIVED" },
    programId: f.programId || undefined,
    ownerId: f.ownerId || undefined,
    branches: f.branchId ? { some: { branchId: f.branchId } } : undefined,
    title: f.q ? { contains: f.q, mode: "insensitive" } : undefined,
  };
  const [rows, ctx] = await Promise.all([
    db.vacancy.findMany({
      where,
      orderBy: [{ requestedAt: "asc" }],
      include: {
        program: true,
        area: true,
        owner: { select: { id: true, name: true } },
        branches: { include: { branch: true } },
        _count: { select: { hires: true, promotions: { where: { removedAt: null } } } },
      },
    }),
    loadAgingContext(),
  ]);
  return rows.map((v) => ({ ...v, aging: computeAging(v, ctx.holidays, ctx.settings) }));
}

export async function getVacancy(actor: Actor, id: string) {
  authorize(actor, "vacancy.read");
  const v = await db.vacancy.findFirst({
    where: { id, ...scopeWhere(actor) },
    include: {
      program: true,
      area: true,
      owner: { select: { id: true, name: true } },
      branches: { include: { branch: true } },
      statusEvents: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
      promotions: {
        where: { removedAt: null },
        orderBy: { promotedAt: "desc" },
        include: { channel: true, partner: true, responsible: { select: { name: true } } },
      },
      _count: { select: { hires: true } },
    },
  });
  if (!v) throw new AppError("NOT_FOUND", "La plaza no existe.");
  const ctx = await loadAgingContext();
  return { ...v, aging: computeAging(v, ctx.holidays, ctx.settings) };
}

export function getFormCatalogs() {
  return Promise.all([
    db.program.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.branch.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { active: true, role: { in: ["HR_COORDINATOR", "TALENT_ADVISOR"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]).then(([programs, areas, branches, owners]) => ({ programs, areas, branches, owners }));
}

// ───────────── Portal público: solo campos públicos, nunca datos administrativos ─────────────

const publicSelect = {
  slug: true,
  title: true,
  status: true,
  modality: true,
  summary: true,
  description: true,
  requirements: true,
  benefits: true,
  salaryText: true,
  publishedAt: true,
  closesAt: true,
  area: { select: { name: true, slug: true } },
  branches: { select: { branch: { select: { name: true } } } },
} satisfies Prisma.VacancySelect;

export type PublicVacancy = Prisma.VacancyGetPayload<{ select: typeof publicSelect }>;

export function listPublicVacancies(f: { area?: string; sede?: string; modalidad?: string; q?: string } = {}) {
  const modality = ["ONSITE", "HYBRID", "REMOTE", "FIELD"].includes(f.modalidad ?? "")
    ? (f.modalidad as "ONSITE")
    : undefined;
  return db.vacancy.findMany({
    where: {
      status: "ACTIVE",
      visibility: "PUBLIC",
      area: f.area ? { slug: f.area } : undefined,
      branches: f.sede ? { some: { branch: { name: f.sede } } } : undefined,
      modality,
      title: f.q ? { contains: f.q, mode: "insensitive" } : undefined,
    },
    orderBy: { publishedAt: "desc" },
    select: publicSelect,
  });
}

/** Activas, pausadas y cerradas conservan su página (anuncios y QR siguen circulando). */
export function getPublicVacancy(slug: string) {
  return db.vacancy.findFirst({
    where: { slug, visibility: "PUBLIC", status: { in: ["ACTIVE", "PAUSED", "CLOSED"] } },
    select: { ...publicSelect, id: true },
  });
}

export function similarPublicVacancies(areaSlug: string | undefined, excludeSlug: string) {
  return db.vacancy.findMany({
    where: { status: "ACTIVE", visibility: "PUBLIC", slug: { not: excludeSlug }, area: areaSlug ? { slug: areaSlug } : undefined },
    take: 3,
    orderBy: { publishedAt: "desc" },
    select: publicSelect,
  });
}
