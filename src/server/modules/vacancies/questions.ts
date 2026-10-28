import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { authorize, type Actor } from "@/server/auth/permissions";
import { audit } from "@/server/modules/audit/service";
import { AppError } from "@/server/lib/result";
import { questionSchema } from "@/server/modules/applications/schemas";

const lines = (s?: string) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

/** Convierte lo escrito en el editor a `expectedAnswer` (ver isMismatch). */
function parseExpected(type: string, raw?: string): Prisma.InputJsonValue | undefined {
  if (!raw) return undefined;
  if (type === "YES_NO") {
    const v = raw.toLowerCase();
    if (v !== "yes" && v !== "no" && v !== "sí" && v !== "si") throw new AppError("VALIDATION", "Respuesta esperada: sí o no.");
    return v === "no" ? "no" : "yes";
  }
  if (type === "SINGLE_CHOICE") return lines(raw);
  if (type === "NUMBER") {
    const m = raw.match(/^\s*(\d+)?\s*-\s*(\d+)?\s*$/);
    if (!m) throw new AppError("VALIDATION", 'Rango esperado como "min-max", p. ej. "18-" o "1-5".');
    return { ...(m[1] ? { min: Number(m[1]) } : {}), ...(m[2] ? { max: Number(m[2]) } : {}) };
  }
  return undefined;
}

async function vacancyFor(actor: Actor, vacancyId: string) {
  const v = await db.vacancy.findUnique({ where: { id: vacancyId }, select: { id: true, ownerId: true } });
  if (!v) throw new AppError("NOT_FOUND", "La plaza no existe.");
  authorize(actor, "question.write", v);
}

export async function addScreeningQuestion(actor: Actor, input: unknown) {
  const f = questionSchema.parse(input);
  await vacancyFor(actor, f.vacancyId);
  const options = f.type === "SINGLE_CHOICE" ? lines(f.options) : undefined;
  if (options && options.length < 2) throw new AppError("VALIDATION", "Escribe al menos dos opciones, una por línea.");
  const expected = parseExpected(f.type, f.expected);
  if (options && Array.isArray(expected) && expected.some((e) => !options.includes(e as string)))
    throw new AppError("VALIDATION", "Las respuestas esperadas deben estar entre las opciones.");
  const last = await db.screeningQuestion.aggregate({ where: { vacancyId: f.vacancyId }, _max: { sortOrder: true } });
  await db.$transaction(async (tx) => {
    const q = await tx.screeningQuestion.create({
      data: {
        vacancyId: f.vacancyId, prompt: f.prompt, type: f.type, required: f.required,
        options, expectedAnswer: expected, sortOrder: (last._max.sortOrder ?? 0) + 1,
      },
    });
    await audit(tx, actor, "question.add", "vacancy", f.vacancyId, { questionId: q.id });
  });
}

/** Solo se elimina si nadie la ha respondido: las respuestas son historial. */
export async function removeScreeningQuestion(actor: Actor, id: string) {
  const q = await db.screeningQuestion.findUnique({ where: { id }, include: { _count: { select: { answers: true } } } });
  if (!q) throw new AppError("NOT_FOUND", "La pregunta no existe.");
  await vacancyFor(actor, q.vacancyId);
  if (q._count.answers > 0) throw new AppError("CONFLICT", "Ya tiene respuestas; no se puede eliminar.");
  await db.$transaction(async (tx) => {
    await tx.screeningQuestion.delete({ where: { id } });
    await audit(tx, actor, "question.remove", "vacancy", q.vacancyId, { questionId: id });
  });
}
