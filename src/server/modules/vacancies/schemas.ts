import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const optionalText = z
  .string()
  .trim()
  .transform((s) => s || undefined)
  .optional();

export const vacancyFieldsSchema = z.object({
  title: z.string().trim().min(3, "Escribe el puesto"),
  programId: z.string().min(1, "Elige el programa"),
  areaId: optionalText,
  branchIds: z.array(z.string()).min(1, "Elige al menos una sede"),
  ownerId: optionalText,
  priority: z.enum(["A", "B", "C"]),
  modality: z.enum(["ONSITE", "HYBRID", "REMOTE", "FIELD"]),
  visibility: z.enum(["PUBLIC", "INTERNAL", "UNPUBLISHED"]),
  positions: z.coerce.number().int().min(1, "Mínimo 1").max(500),
  requestedAt: isoDate,
  closesAt: isoDate.optional().or(z.literal("").transform(() => undefined)),
  summary: optionalText,
  description: optionalText,
  requirements: optionalText,
  benefits: optionalText,
  salaryText: optionalText,
  observations: optionalText,
});
export type VacancyFields = z.infer<typeof vacancyFieldsSchema>;

export const updateVacancySchema = vacancyFieldsSchema.extend({ id: z.string().min(1) });

export const transitionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "publish", "pause", "close", "reactivate", "archive"]),
  reason: optionalText,
});

export const vacancyFiltersSchema = z.object({
  status: z.enum(["PENDING_APPROVAL", "DRAFT", "ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"]).optional().catch(undefined),
  programId: z.string().optional(),
  branchId: z.string().optional(),
  ownerId: z.string().optional(),
  q: z.string().optional(),
});
export type VacancyFilters = z.infer<typeof vacancyFiltersSchema>;
