import type { Prisma } from "@prisma/client";
import { db, type Tx } from "@/server/db";
import { appResource, authorize, type Actor } from "@/server/auth/permissions";
import { audit } from "@/server/modules/audit/service";
import { AppError } from "@/server/lib/result";
import { trackingCode } from "@/server/lib/codes";
import { todayGT } from "@/server/lib/businessDays";
import { storage } from "@/server/integrations/storage";
import { sendEmail, siteUrl } from "@/server/integrations/email";
import { CV_MAX_BYTES, CV_TYPES, isMismatch } from "./rules";
import {
  contactSchema, interviewResultSchema, interviewSchema, manualApplicationSchema, moveSchema,
  statusLookupSchema, submitApplicationSchema, uploadRequestSchema,
} from "./schemas";
import type { z } from "zod";

export type Touch = {
  utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string;
  referrer?: string; landingPath?: string; externalIds?: Record<string, string>; at: string;
};

const openVacancy = (slug: string) =>
  db.vacancy.findFirst({
    where: { slug, status: "ACTIVE", visibility: "PUBLIC" },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });

// ───────────────────────────── Portal (sin sesión) ─────────────────────────────

/** Paso 1 de la subida: valida y devuelve una URL prefirmada; el archivo va directo al bucket. */
export async function requestCvUpload(input: unknown) {
  const f = uploadRequestSchema.parse(input);
  const ext = CV_TYPES[f.contentType];
  if (!ext) throw new AppError("VALIDATION", "Sube tu CV en PDF, DOC o DOCX.");
  if (f.size > CV_MAX_BYTES) throw new AppError("VALIDATION", "El CV debe pesar 5 MB o menos.");
  if (!(await openVacancy(f.slug))) throw new AppError("NOT_FOUND", "Esta vacante ya no recibe aplicaciones.");
  const file = await db.file.create({
    data: { storageKey: `cv/tmp/${crypto.randomUUID()}.${ext}`, kind: "CV", fileName: f.fileName, mimeType: f.contentType, sizeBytes: f.size },
  });
  return { fileId: file.id, uploadUrl: await storage.uploadUrl(file.storageKey, f.contentType) };
}

/** Crea o actualiza al candidato por teléfono (único). Un correo ya usado por otra persona no se toma. */
async function upsertCandidate(tx: Tx, c: z.infer<typeof contactSchema>) {
  const emailTaken = c.email
    ? await tx.candidate.findFirst({ where: { email: c.email, NOT: { phone: c.phone } }, select: { id: true } })
    : null;
  const email = emailTaken ? undefined : c.email;
  return tx.candidate.upsert({
    where: { phone: c.phone },
    update: { firstName: c.firstName, lastName: c.lastName, ...(email ? { email } : {}) },
    create: { firstName: c.firstName, lastName: c.lastName, phone: c.phone, email },
  });
}

async function newTrackingCode(tx: Tx) {
  for (;;) {
    const code = trackingCode();
    if (!(await tx.application.findUnique({ where: { trackingCode: code }, select: { id: true } }))) return code;
  }
}

async function stageByKey(tx: Tx | typeof db, key: string) {
  const s = await tx.pipelineStage.findUnique({ where: { key } });
  if (!s?.active) throw new AppError("VALIDATION", "Etapa inválida.");
  return s;
}

export type SubmitResult = { trackingCode: string; duplicate: false } | { duplicate: true };

export async function submitApplication(input: unknown, ctx: { ip?: string; first?: Touch; last?: Touch }): Promise<SubmitResult> {
  const f = submitApplicationSchema.parse(input);
  const vacancy = await openVacancy(f.slug);
  if (!vacancy) throw new AppError("NOT_FOUND", "Esta vacante ya no recibe aplicaciones.");

  // Precalificación: requeridas presentes; las que no coinciden se marcan, nunca se descartan.
  const answers = vacancy.questions.flatMap((q) => {
    const value = f.answers[q.id];
    if (value === undefined || value === "") {
      if (q.required) throw new AppError("VALIDATION", `Responde: "${q.prompt}"`);
      return [];
    }
    return [{ questionId: q.id, value, mismatch: isMismatch(q.type, q.expectedAnswer, value) }];
  });

  const cv = f.cvFileId
    ? await db.file.findFirst({ where: { id: f.cvFileId, kind: "CV", deletedAt: null, applicationCv: null } })
    : null;
  if (f.cvFileId && !cv) throw new AppError("VALIDATION", "No encontramos tu CV; vuelve a subirlo.");
  if (vacancy.cvRequired && !cv) throw new AppError("VALIDATION", "Esta vacante pide tu CV.");
  if (cv) {
    // La URL prefirmada no limita el tamaño: se verifica lo que realmente llegó al bucket.
    const size = await storage.size(cv.storageKey);
    if (size === null) throw new AppError("VALIDATION", "Tu CV no terminó de subir; inténtalo de nuevo.");
    if (size > CV_MAX_BYTES) throw new AppError("VALIDATION", "El CV debe pesar 5 MB o menos.");
  }

  const consentVersion = await db.consentVersion.findFirst({ where: { purpose: "application" }, orderBy: { version: "desc" } });
  if (!consentVersion) throw new Error("Falta el texto de consentimiento (consent_versions, purpose=application).");

  const result = await db.$transaction(async (tx): Promise<SubmitResult & { email?: string; name?: string }> => {
    const candidate = await upsertCandidate(tx, f);
    // Una persona no aplica dos veces a la misma plaza: el segundo intento solo actualiza el contacto.
    if (await tx.application.findUnique({ where: { candidateId_vacancyId: { candidateId: candidate.id, vacancyId: vacancy.id } } }))
      return { duplicate: true };

    const stage = await stageByKey(tx, "new");
    const code = await newTrackingCode(tx);
    const touches = (["FIRST", "LAST"] as const).flatMap((type) => {
      const t = type === "FIRST" ? ctx.first : ctx.last ?? ctx.first;
      if (!t) return [];
      const { at, externalIds, ...rest } = t;
      return [{ type, ...rest, externalIds, occurredAt: new Date(at) }];
    });
    const app = await tx.application.create({
      data: {
        candidateId: candidate.id,
        vacancyId: vacancy.id,
        stageId: stage.id,
        trackingCode: code,
        motivation: f.motivation || null,
        cvFileId: cv?.id,
        source: ctx.last?.utmSource ?? ctx.first?.utmSource ?? "portal",
        needsReview: answers.some((a) => a.mismatch),
        answers: { create: answers },
        touches: { create: touches },
        stageEvents: { create: { toStageId: stage.id } },
      },
    });
    await tx.consent.create({ data: { candidateId: candidate.id, consentVersionId: consentVersion.id, ip: ctx.ip } });
    await audit(tx, null, "application.submit", "application", app.id);
    return { trackingCode: code, duplicate: false, email: candidate.email ?? undefined, name: candidate.firstName };
  });

  if (!result.duplicate && result.email) {
    await sendEmail({
      to: result.email,
      subject: `Recibimos tu aplicación: ${vacancy.title}`,
      text:
        `Hola ${result.name}:\n\nRecibimos tu aplicación a "${vacancy.title}".\n` +
        `Tu código de seguimiento es ${result.trackingCode}. Consulta tu estado en ${siteUrl()}/mi-candidatura ` +
        `con el código y los últimos 4 dígitos de tu teléfono.\n\nFUNDAP nunca cobra por aplicar.`,
    });
  }
  return result.duplicate ? { duplicate: true } : { trackingCode: result.trackingCode, duplicate: false };
}

const LOOKUP_WINDOW_MIN = 15;
const LOOKUP_MAX_FAILS = 5;

/** Mi candidatura: código + últimos 4 dígitos. Solo etiquetas públicas; 5 fallos por IP → espera. */
export async function checkApplicationStatus(input: unknown, ip: string) {
  const f = statusLookupSchema.parse(input);
  const fails = await db.auditLog.count({
    where: { action: "status.lookup_failed", ip, createdAt: { gte: new Date(Date.now() - LOOKUP_WINDOW_MIN * 60_000) } },
  });
  if (fails >= LOOKUP_MAX_FAILS)
    throw new AppError("FORBIDDEN", `Demasiados intentos. Espera ${LOOKUP_WINDOW_MIN} minutos e inténtalo de nuevo.`);

  const app = await db.application.findUnique({
    where: { trackingCode: f.code },
    include: {
      candidate: { select: { firstName: true, phone: true } },
      vacancy: { select: { title: true } },
      stage: { select: { publicLabel: true } },
      stageEvents: { orderBy: { createdAt: "asc" }, select: { createdAt: true, toStage: { select: { publicLabel: true } } } },
    },
  });
  if (!app || !app.candidate.phone.endsWith(f.last4)) {
    await db.auditLog.create({ data: { action: "status.lookup_failed", entityType: "application", entityId: "-", ip } });
    throw new AppError("NOT_FOUND", "No encontramos una aplicación con esos datos.");
  }
  return {
    firstName: app.candidate.firstName,
    vacancy: app.vacancy.title,
    current: app.stage.publicLabel,
    events: app.stageEvents.map((e) => ({ label: e.toStage.publicLabel, at: e.createdAt })),
  };
}

// ───────────────────────────── Panel (con sesión) ─────────────────────────────

const appWithVacancy = { vacancy: { select: { id: true, title: true, ownerId: true } }, stage: true, candidate: true } satisfies Prisma.ApplicationInclude;

async function loadApp(id: string) {
  const app = await db.application.findUnique({ where: { id }, include: appWithVacancy });
  if (!app) throw new AppError("NOT_FOUND", "La aplicación no existe.");
  return app;
}

/** Cambio de etapa dentro de una transacción: valida, mueve, crea contratación si aplica y escribe historial. */
async function moveInTx(
  tx: Tx,
  actor: Actor | null,
  app: { id: string; stageId: string; vacancyId: string },
  to: { id: string; key: string; category: string; requiresReason: boolean },
  reason?: string,
) {
  if (to.requiresReason && !reason) throw new AppError("VALIDATION", "Esta etapa exige un motivo.");
  const { count } = await tx.application.updateMany({
    where: { id: app.id, stageId: app.stageId },
    data: { stageId: to.id, closedReason: to.category === "ACTIVE" ? null : (reason ?? null) },
  });
  if (count === 0) throw new AppError("CONFLICT", "La aplicación cambió mientras tanto; recarga la página.");
  await tx.applicationStageEvent.create({
    data: { applicationId: app.id, fromStageId: app.stageId, toStageId: to.id, reason, actorId: actor?.id },
  });
  // Pasar a Contratado crea la contratación y su checklist de expediente.
  if (to.category === "HIRED" && !(await tx.hire.findUnique({ where: { applicationId: app.id } }))) {
    const items = await tx.onboardingItem.findMany({ where: { active: true } });
    await tx.hire.create({
      data: {
        applicationId: app.id,
        vacancyId: app.vacancyId,
        hiredAt: new Date(todayGT() + "T00:00:00Z"),
        checklist: { create: items.map((i) => ({ itemId: i.id })) },
      },
    });
  }
  await audit(tx, actor, "application.move", "application", app.id, { to: to.key, reason });
}

export async function moveApplication(actor: Actor, input: unknown) {
  const { id, stageKey, reason } = moveSchema.parse(input);
  const app = await loadApp(id);
  authorize(actor, "application.move", appResource(app));
  // Una aplicación cerrada (o contratada) solo la reabre Coordinación RR. HH.
  if (app.stage.category !== "ACTIVE") authorize(actor, "application.reopen");
  const to = await stageByKey(db, stageKey);
  if (to.id === app.stageId) return;
  await db.$transaction((tx) => moveInTx(tx, actor, app, to, reason));

  if (app.candidate.email && to.publicLabel !== app.stage.publicLabel) {
    await sendEmail({
      to: app.candidate.email,
      subject: `Tu aplicación a ${app.vacancy.title}: ${to.publicLabel}`,
      text: `Hola ${app.candidate.firstName}:\n\nTu aplicación a "${app.vacancy.title}" pasó a: ${to.publicLabel}.\n` +
        `Consulta el detalle en ${siteUrl()}/mi-candidatura.`,
    });
  }
}

/** Al cerrar una plaza: mueve sus aplicaciones activas a "Vacante cerrada" o "Base de talento". */
export async function moveActiveApplicationsInTx(tx: Tx, actor: Actor | null, vacancyId: string, stageKey: string, reason: string) {
  const to = await stageByKey(tx, stageKey);
  const apps = await tx.application.findMany({ where: { vacancyId, stage: { category: "ACTIVE" } } });
  for (const app of apps) await moveInTx(tx, actor, app, to, reason);
  if (stageKey === "talent_pool" && apps.length)
    await tx.candidate.updateMany({ where: { id: { in: apps.map((a) => a.candidateId) } }, data: { inTalentPool: true } });
  return apps.length;
}

export async function assignApplication(actor: Actor, input: { id: string; assigneeId?: string }) {
  authorize(actor, "application.assign");
  await db.$transaction(async (tx) => {
    await tx.application.update({ where: { id: input.id }, data: { assigneeId: input.assigneeId || null } });
    await audit(tx, actor, "application.assign", "application", input.id, { assigneeId: input.assigneeId ?? null });
  });
}

/** Aplicación registrada por RR. HH. (feria, referido, aliado). */
export async function createApplicationManual(actor: Actor, input: unknown) {
  const f = manualApplicationSchema.parse(input);
  const vacancy = await db.vacancy.findUnique({ where: { id: f.vacancyId } });
  if (!vacancy) throw new AppError("NOT_FOUND", "La plaza no existe.");
  authorize(actor, "application.create", vacancy);
  return db.$transaction(async (tx) => {
    const candidate = await upsertCandidate(tx, f);
    const existing = await tx.application.findUnique({
      where: { candidateId_vacancyId: { candidateId: candidate.id, vacancyId: vacancy.id } },
    });
    if (existing) throw new AppError("CONFLICT", "Esta persona ya tiene una aplicación en esa plaza.");
    const stage = await stageByKey(tx, "new");
    const app = await tx.application.create({
      data: {
        candidateId: candidate.id,
        vacancyId: vacancy.id,
        stageId: stage.id,
        trackingCode: await newTrackingCode(tx),
        source: `manual:${f.source}${f.sourceDetail ? `:${f.sourceDetail}` : ""}`,
        assigneeId: actor.id,
        stageEvents: { create: { toStageId: stage.id, actorId: actor.id } },
      },
    });
    await audit(tx, actor, "application.create_manual", "application", app.id);
    return app;
  });
}

/** datetime-local en hora de Guatemala (UTC-6, sin horario de verano) → instante UTC. */
const gtLocalToDate = (s: string) => new Date(`${s.length === 16 ? s + ":00" : s}-06:00`);

export async function scheduleInterview(actor: Actor, input: unknown) {
  const f = interviewSchema.parse(input);
  const app = await loadApp(f.applicationId);
  authorize(actor, "application.move", appResource(app));
  const scheduledAt = gtLocalToDate(f.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new AppError("VALIDATION", "Fecha y hora inválidas.");
  await db.$transaction(async (tx) => {
    const i = await tx.interview.create({
      data: { applicationId: app.id, kind: f.kind, scheduledAt, location: f.location, participants: { create: { userId: actor.id } } },
    });
    await audit(tx, actor, "interview.schedule", "application", app.id, { interviewId: i.id });
  });
}

export async function recordInterviewResult(actor: Actor, input: unknown) {
  const f = interviewResultSchema.parse(input);
  const interview = await db.interview.findUnique({ where: { id: f.id }, include: { application: { include: appWithVacancy } } });
  if (!interview) throw new AppError("NOT_FOUND", "La entrevista no existe.");
  authorize(actor, "application.move", appResource(interview.application));
  await db.$transaction(async (tx) => {
    await tx.interview.update({ where: { id: f.id }, data: { result: f.result, resultNotes: f.resultNotes } });
    await audit(tx, actor, "interview.result", "application", interview.applicationId, { result: f.result });
  });
}

/** URL firmada de 5 minutos; toda descarga de CV queda auditada. */
export async function getFileDownloadUrl(actor: Actor, fileId: string) {
  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { applicationCv: { include: { vacancy: { select: { ownerId: true } } } } },
  });
  if (!file || file.deletedAt || !file.applicationCv) throw new AppError("NOT_FOUND", "El archivo no existe.");
  authorize(actor, "cv.download", appResource(file.applicationCv));
  await db.auditLog.create({ data: { actorId: actor.id, action: "file.download", entityType: "file", entityId: file.id } });
  return storage.downloadUrl(file.storageKey, file.fileName);
}

/** Cron: borra CV subidos que nunca se ligaron a una aplicación (más de 24 h). */
export async function cleanupOrphanUploads() {
  const orphans = await db.file.findMany({
    where: { kind: "CV", deletedAt: null, applicationCv: null, createdAt: { lt: new Date(Date.now() - 24 * 3600_000) } },
  });
  for (const f of orphans) {
    await storage.remove(f.storageKey);
    await db.file.update({ where: { id: f.id }, data: { deletedAt: new Date() } });
  }
  return orphans.length;
}
