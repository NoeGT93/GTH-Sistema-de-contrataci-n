import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { authorize, type Actor } from "@/server/auth/permissions";
import { businessDays, todayGT } from "@/server/lib/businessDays";
import { computeAging, loadAgingContext, type AgingStatus } from "./aging";
import { STATUS_LABEL } from "@/server/modules/vacancies/transitions";

const OPEN = ["PENDING_APPROVAL", "DRAFT", "ACTIVE", "PAUSED"] as const;

/** Dashboard de Control de plazas. Todo se calcula desde datos y eventos; nada se captura a mano. */
export async function getDashboard(actor: Actor) {
  authorize(actor, "report.read");
  // El asesor ve reportes de sus plazas; el resto, todo (sin datos personales de candidatos).
  const scope: Prisma.VacancyWhereInput = actor.role === "TALENT_ADVISOR" ? { ownerId: actor.id } : {};
  const year = Number(todayGT().slice(0, 4));

  const [open, byStatus, thisYear, ctx, stages, reached] = await Promise.all([
    db.vacancy.findMany({
      where: { ...scope, status: { in: [...OPEN] } },
      select: {
        id: true, title: true, priority: true, requestedAt: true, closedAt: true, status: true, publishedAt: true,
        positions: true,
        program: { select: { name: true } },
        owner: { select: { name: true } },
        _count: { select: { hires: true, promotions: { where: { removedAt: null } } } },
      },
    }),
    db.vacancy.groupBy({ by: ["status"], where: { ...scope, status: { not: "ARCHIVED" } }, _count: true }),
    db.vacancy.findMany({
      where: { ...scope, requestedAt: { gte: new Date(`${year}-01-01T00:00:00Z`) } },
      select: { requestedAt: true, program: { select: { name: true } } },
    }),
    loadAgingContext(),
    db.pipelineStage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    // Conversión: aplicaciones del año que alcanzaron cada etapa (solo cifras, sin datos personales).
    db.applicationStageEvent.findMany({
      where: { application: { vacancy: scope, createdAt: { gte: new Date(`${year}-01-01T00:00:00Z`) } } },
      distinct: ["applicationId", "toStageId"],
      select: { applicationId: true, toStage: { select: { sortOrder: true, category: true } } },
    }),
  ]);
  // Una aplicación "alcanzó" cada etapa hasta la más avanzada que tocó (saltarse etapas no la resta).
  const furthest = new Map<string, number>();
  for (const r of reached)
    if (r.toStage.category === "ACTIVE" || r.toStage.category === "HIRED")
      furthest.set(r.applicationId, Math.max(furthest.get(r.applicationId) ?? 0, r.toStage.sortOrder));
  const funnel = stages
    .filter((st) => st.category === "ACTIVE" || st.category === "HIRED")
    .map((st) => ({ name: st.name, count: [...furthest.values()].filter((o) => o >= st.sortOrder).length }));

  const aging: Record<AgingStatus, number> = { ON_TIME: 0, DUE_SOON: 0, OVERDUE: 0 };
  const withAging = open.map((v) => {
    const a = computeAging(v, ctx.holidays, ctx.settings);
    aging[a.status]++;
    return { ...v, aging: a };
  });

  const today = todayGT();
  const withoutPromotion = withAging.filter(
    (v) => v.status === "ACTIVE" && v._count.promotions === 0 && v.publishedAt &&
      businessDays(v.publishedAt, today, ctx.holidays) > 3,
  );

  // Requerimientos por mes y programa (pendiente: ¿requerimientos o posiciones?).
  const months = Array.from({ length: 12 }, () => 0);
  const byProgram = new Map<string, number[]>();
  for (const v of thisYear) {
    const m = v.requestedAt.getUTCMonth();
    months[m]++;
    if (!byProgram.has(v.program.name)) byProgram.set(v.program.name, Array.from({ length: 12 }, () => 0));
    byProgram.get(v.program.name)![m]++;
  }

  return {
    year,
    openCount: open.length,
    openPositions: open.reduce((s, v) => s + Math.max(0, v.positions - v._count.hires), 0),
    aging,
    byStatus: byStatus.map((s) => ({ status: s.status, label: STATUS_LABEL[s.status], count: s._count })),
    overdue: withAging
      .filter((v) => v.aging.status !== "ON_TIME")
      .sort((a, b) => b.aging.days - b.aging.limit - (a.aging.days - a.aging.limit))
      .slice(0, 10),
    withoutPromotion,
    months,
    funnel,
    byProgram: [...byProgram.entries()].map(([program, counts]) => ({ program, counts })),
  };
}
