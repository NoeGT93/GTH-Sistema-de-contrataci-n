import { z } from "zod";
import { normalizePhone } from "@/server/lib/phone";

const opt = z.string().trim().transform((s) => s || undefined).optional();

export const contactSchema = z.object({
  firstName: z.string().trim().min(2, "Escribe tu nombre").max(80),
  lastName: z.string().trim().min(2, "Escribe tu apellido").max(80),
  phone: z
    .string()
    .transform((s, ctx) => normalizePhone(s) ?? (ctx.addIssue({ code: "custom", message: "Escribe un teléfono válido de 8 dígitos" }), z.NEVER)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((s) => s || undefined)
    .pipe(z.email("Correo inválido").optional())
    .optional(),
});

export const submitApplicationSchema = contactSchema.extend({
  slug: z.string().min(1),
  answers: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  motivation: z.string().trim().max(2000).optional(),
  cvFileId: opt,
  consent: z.literal(true, { error: "Necesitamos tu autorización para procesar tus datos" }),
});

export const uploadRequestSchema = z.object({
  slug: z.string().min(1),
  fileName: z.string().trim().min(1).max(200),
  contentType: z.string(),
  size: z.number().int().positive(),
});

export const statusLookupSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/, "El código tiene 8 caracteres"),
  last4: z.string().trim().regex(/^\d{4}$/, "Escribe los últimos 4 dígitos"),
});

export const moveSchema = z.object({ id: z.string().min(1), stageKey: z.string().min(1), reason: opt });

export const manualApplicationSchema = contactSchema.extend({
  vacancyId: z.string().min(1, "Elige la plaza"),
  source: z.enum(["feria", "referido", "aliado", "otro"]),
  sourceDetail: opt,
});

export const interviewSchema = z.object({
  applicationId: z.string().min(1),
  kind: z.enum(["HR", "MANAGEMENT", "FINAL"]),
  scheduledAt: z.string().min(1, "Elige fecha y hora"), // datetime-local, hora de Guatemala
  location: opt,
});

export const interviewResultSchema = z.object({
  id: z.string().min(1),
  result: z.enum(["FAVORABLE", "NOT_FAVORABLE", "NO_SHOW"]),
  resultNotes: opt,
});

export const noteSchema = z.object({
  candidateId: z.string().min(1),
  applicationId: opt,
  body: z.string().trim().min(1, "Escribe la nota").max(5000),
});

export const questionSchema = z.object({
  vacancyId: z.string().min(1),
  prompt: z.string().trim().min(5, "Escribe la pregunta").max(300),
  type: z.enum(["YES_NO", "SINGLE_CHOICE", "TEXT", "NUMBER"]),
  options: opt, // SINGLE_CHOICE: una opción por línea
  expected: opt, // YES_NO: yes|no · SINGLE_CHOICE: opciones aceptadas, una por línea · NUMBER: "min-max"
  required: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});
