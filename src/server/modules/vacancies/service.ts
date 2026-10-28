import { db } from "@/server/db";
import { authorize, type Actor } from "@/server/auth/permissions";
import { audit } from "@/server/modules/audit/service";
import { AppError } from "@/server/lib/result";
import { slugify, trackingCode } from "@/server/lib/codes";
import { todayGT } from "@/server/lib/businessDays";
import { transitionSchema, updateVacancySchema, vacancyFieldsSchema, type VacancyFields } from "./schemas";
import { TRANSITIONS, type TransitionKey } from "./transitions";
import { moveActiveApplicationsInTx } from "@/server/modules/applications/service";

const asDate = (s?: string) => (s ? new Date(s + "T00:00:00Z") : null);

function vacancyData(f: VacancyFields) {
  return {
    title: f.title,
    programId: f.programId,
    areaId: f.areaId ?? null,
    priority: f.priority,
    modality: f.modality,
    visibility: f.visibility,
    positions: f.positions,
    requestedAt: asDate(f.requestedAt)!,
    closesAt: asDate(f.closesAt),
    summary: f.summary ?? null,
    description: f.description ?? null,
    requirements: f.requirements ?? null,
    benefits: f.benefits ?? null,
    salaryText: f.salaryText ?? null,
    observations: f.observations ?? null,
  };
}

// ponytail: posiciones por sede solo cuando hay una sede; repartir entre varias llega con su UI.
const branchRows = (f: VacancyFields) =>
  f.branchIds.map((branchId) => ({ branchId, positions: f.branchIds.length === 1 ? f.positions : 1 }));

export async function createRequisition(actor: Actor, input: unknown) {
  const f = vacancyFieldsSchema.parse(input);
  authorize(actor, "vacancy.create");
  // El asesor solo crea plazas propias.
  const ownerId = actor.role === "TALENT_ADVISOR" ? actor.id : (f.ownerId ?? actor.id);
  return db.$transaction(async (tx) => {
    const v = await tx.vacancy.create({
      data: { ...vacancyData(f), ownerId, requestedById: actor.id, branches: { create: branchRows(f) } },
    });
    await tx.vacancyStatusEvent.create({ data: { vacancyId: v.id, toStatus: v.status, actorId: actor.id } });
    await audit(tx, actor, "vacancy.create", "vacancy", v.id);
    return v;
  });
}

export async function updateVacancy(actor: Actor, input: unknown) {
  const f = updateVacancySchema.parse(input);
  const current = await db.vacancy.findUnique({ where: { id: f.id } });
  if (!current) throw new AppError("NOT_FOUND", "La plaza no existe.");
  authorize(actor, "vacancy.update", current);
  const canReassign = actor.role !== "TALENT_ADVISOR";
  return db.$transaction(async (tx) => {
    await tx.vacancyBranch.deleteMany({ where: { vacancyId: f.id } });
    const v = await tx.vacancy.update({
      where: { id: f.id },
      data: {
        ...vacancyData(f),
        ...(canReassign && f.ownerId ? { ownerId: f.ownerId } : {}),
        branches: { create: branchRows(f) },
      },
    });
    await audit(tx, actor, "vacancy.update", "vacancy", v.id);
    return v;
  });
}

export async function transitionVacancy(actor: Actor | null, input: unknown) {
  const { id, action, reason, moveApplicationsTo } = transitionSchema.parse(input);
  const t = TRANSITIONS[action as TransitionKey];
  const v = await db.vacancy.findUnique({ where: { id }, include: { branches: true } });
  if (!v) throw new AppError("NOT_FOUND", "La plaza no existe.");
  if (actor) authorize(actor, t.permission, v); // actor null = sistema (cron)
  if (!(t.from as readonly string[]).includes(v.status))
    throw new AppError("INVALID_TRANSITION", `No se puede ${t.label.toLowerCase()} una plaza en este estado.`);
  if (t.reason && !reason) throw new AppError("VALIDATION", "El motivo es obligatorio.");

  const now = new Date();
  const data: Record<string, unknown> = { status: t.to };
  if (action === "approve") data.approvedAt = now;
  if (action === "publish") {
    if (!v.areaId || v.branches.length === 0)
      throw new AppError("VALIDATION", "Para publicar se necesitan título, sede y área.");
    if (v.visibility === "PUBLIC" && !v.closesAt)
      throw new AppError("VALIDATION", "Una plaza pública necesita fecha de cierre.");
    if (v.visibility === "PUBLIC" && v.closesAt && v.closesAt.toISOString().slice(0, 10) < todayGT())
      throw new AppError("VALIDATION", "La fecha de cierre ya pasó; actualízala antes de publicar.");
    // El slug se asigna una sola vez: pausar o reactivar conserva la URL.
    if (!v.slug) data.slug = `${slugify(v.title)}-${trackingCode(4).toLowerCase()}`;
    if (!v.publishedAt) data.publishedAt = now;
  }
  if (action === "close") Object.assign(data, { closedAt: now, closeReason: reason });
  if (action === "reactivate") Object.assign(data, { closedAt: null, closeReason: null });
  if (action === "archive") data.archivedAt = now;

  return db.$transaction(async (tx) => {
    // Guarda contra carreras: solo actualiza si el estado no cambió desde que lo leímos.
    const { count } = await tx.vacancy.updateMany({ where: { id, status: v.status }, data });
    if (count === 0) throw new AppError("CONFLICT", "La plaza cambió mientras tanto; recarga la página.");
    await tx.vacancyStatusEvent.create({
      data: { vacancyId: id, fromStatus: v.status, toStatus: t.to, reason, actorId: actor?.id },
    });
    await audit(tx, actor, `vacancy.${action}`, "vacancy", id, reason ? { reason } : undefined);
    if (action === "close" && moveApplicationsTo)
      await moveActiveApplicationsInTx(tx, actor, id, moveApplicationsTo, reason ?? "Vacante cerrada");
  });
}

/** Cron diario: cierra plazas activas cuya fecha de cierre ya pasó. */
export async function closeExpiredVacancies() {
  const expired = await db.vacancy.findMany({
    where: { status: "ACTIVE", closesAt: { lt: new Date(todayGT() + "T00:00:00Z") } },
    select: { id: true },
  });
  for (const { id } of expired) await transitionVacancy(null, { id, action: "close", reason: "Fecha de cierre" });
  return expired.length;
}
