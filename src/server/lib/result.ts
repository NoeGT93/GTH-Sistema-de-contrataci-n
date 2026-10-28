import { ZodError } from "zod";

export type ErrorCode = "VALIDATION" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_TRANSITION" | "CONFLICT";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; fields?: Record<string, string[]> } };

export class AppError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
  }
}

/** Envuelve un caso de uso: convierte errores conocidos en Result; el resto se relanza. */
export async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: { code: e.code, message: e.message } };
    if (e instanceof ZodError) {
      const fields: Record<string, string[]> = {};
      for (const issue of e.issues) (fields[issue.path.join(".")] ??= []).push(issue.message);
      return { ok: false, error: { code: "VALIDATION", message: "Revisa los campos marcados.", fields } };
    }
    throw e;
  }
}
