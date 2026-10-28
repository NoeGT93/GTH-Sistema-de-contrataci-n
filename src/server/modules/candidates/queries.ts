import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { authorize, type Actor } from "@/server/auth/permissions";
import { AppError } from "@/server/lib/result";

/** Aplicaciones que el actor puede ver: todas, o las de sus plazas y las asignadas (asesor). */
export function appScope(actor: Actor): Prisma.ApplicationWhereInput {
  return actor.role === "TALENT_ADVISOR" ? { OR: [{ vacancy: { ownerId: actor.id } }, { assigneeId: actor.id }] } : {};
}

export async function listCandidates(actor: Actor, f: { q?: string; vacancyId?: string; stageKey?: string }) {
  authorize(actor, "candidate.read");
  const appWhere: Prisma.ApplicationWhereInput = {
    ...appScope(actor),
    vacancyId: f.vacancyId || undefined,
    stage: f.stageKey ? { key: f.stageKey } : undefined,
  };
  const q = f.q?.trim();
  return db.candidate.findMany({
    where: {
      anonymizedAt: null,
      applications: { some: appWhere },
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q.replace(/\D/g, "") || q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200, // ponytail: sin paginación; agregar cursor cuando pase de unos cientos
    include: {
      applications: {
        where: appWhere,
        orderBy: { createdAt: "desc" },
        include: { vacancy: { select: { title: true } }, stage: { select: { name: true, category: true } } },
      },
    },
  });
}

export async function getCandidate(actor: Actor, id: string) {
  authorize(actor, "candidate.read");
  const scope = appScope(actor);
  const c = await db.candidate.findFirst({
    where: { id, applications: { some: scope } },
    include: {
      tags: { include: { tag: true } },
      notes: {
        // El asesor ve notas generales y las de aplicaciones que puede ver.
        where: { OR: [{ applicationId: null }, { application: scope }] },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
      applications: {
        where: scope,
        orderBy: { createdAt: "desc" },
        include: {
          vacancy: { select: { id: true, title: true, ownerId: true } },
          stage: true,
          assignee: { select: { id: true, name: true } },
          cvFile: { select: { id: true, fileName: true } },
          answers: { include: { question: true }, orderBy: { question: { sortOrder: "asc" } } },
          interviews: { orderBy: { scheduledAt: "desc" }, include: { participants: { include: { user: { select: { name: true } } } } } },
          stageEvents: {
            orderBy: { createdAt: "desc" },
            include: { toStage: { select: { name: true } }, actor: { select: { name: true } } },
          },
          touches: true,
          hire: { select: { id: true } },
        },
      },
    },
  });
  if (!c) throw new AppError("NOT_FOUND", "El candidato no existe.");
  return c;
}

export async function getPipeline(actor: Actor, vacancyId: string) {
  authorize(actor, "candidate.read");
  const [vacancy, stages, apps] = await Promise.all([
    db.vacancy.findUnique({ where: { id: vacancyId }, select: { id: true, title: true, ownerId: true, status: true } }),
    db.pipelineStage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.application.findMany({
      where: { ...appScope(actor), vacancyId },
      orderBy: { createdAt: "asc" },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true } },
        stageEvents: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        assignee: { select: { name: true } },
      },
    }),
  ]);
  if (!vacancy) throw new AppError("NOT_FOUND", "La plaza no existe.");
  return { vacancy, stages, apps };
}

/** Plazas con aplicaciones visibles para el actor (selector del pipeline). */
export function pipelineVacancies(actor: Actor) {
  return db.vacancy.findMany({
    where: { status: { not: "ARCHIVED" }, applications: { some: appScope(actor) } },
    orderBy: { title: "asc" },
    select: { id: true, title: true, _count: { select: { applications: true } } },
  });
}
