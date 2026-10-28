import type { QuestionType } from "@prisma/client";

// Reglas puras del pipeline: sin base de datos, fáciles de probar.

/**
 * Precalificación sin descarte automático: si la respuesta no coincide con la esperada
 * solo se marca `mismatch` (y la aplicación `needsReview`); decide una persona.
 * expectedAnswer: YES_NO → "yes"|"no"; SINGLE_CHOICE → opción o lista de opciones; NUMBER → { min?, max? }.
 */
export function isMismatch(type: QuestionType, expected: unknown, value: unknown): boolean {
  if (expected == null) return false;
  switch (type) {
    case "YES_NO":
      return value !== expected;
    case "SINGLE_CHOICE":
      return !(Array.isArray(expected) ? expected : [expected]).includes(value);
    case "NUMBER": {
      const { min, max } = expected as { min?: number; max?: number };
      const n = Number(value);
      return Number.isNaN(n) || (min != null && n < min) || (max != null && n > max);
    }
    default:
      return false;
  }
}

/** Línea de tiempo para el candidato: solo etiquetas públicas, sin repetir consecutivas. */
export function publicTimeline(events: { label: string; at: Date }[]) {
  return events.filter((e, i) => i === 0 || e.label !== events[i - 1].label);
}

export const CV_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
export const CV_MAX_BYTES = 5 * 1024 * 1024;
