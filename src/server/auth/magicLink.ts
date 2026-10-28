import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Secreto de sesión. Si no hay AUTH_SECRET se deriva de DATABASE_URL (ya es secreta),
 * para que el despliegue no pida inventar otra variable. Cambiar la clave de la base cierra sesiones.
 */
export function authSecret(): string | undefined {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const db = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  return db ? createHash("sha256").update(`fundap-auth:${db}`).digest("hex") : undefined;
}

export const LINK_TTL_MIN = 15;

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(`magic:${payload}`).digest("base64url");

/** Token firmado (sin tabla): correo + vencimiento + nonce. El nonce permite usarlo una sola vez. */
export function createLinkToken(email: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ e: email.toLowerCase(), x: now + LINK_TTL_MIN * 60_000, n: randomBytes(12).toString("base64url") }),
  ).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** Devuelve correo y nonce si la firma es válida y no venció; si no, null. */
export function verifyLinkToken(token: string, secret: string, now = Date.now()): { email: string; nonce: string } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const good = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !timingSafeEqual(good, given)) return null;
  try {
    const { e, x, n } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof e === "string" && typeof n === "string" && typeof x === "number" && x > now ? { email: e, nonce: n } : null;
  } catch {
    return null;
  }
}
