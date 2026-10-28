// Correo transaccional. Resend por HTTP si hay API key; si no, se registra en consola (desarrollo).
// Nunca bloquea el caso de uso: un correo que falla no deshace una aplicación.

export async function sendEmail(msg: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] → ${msg.to}: ${msg.subject}\n${msg.text}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      // Sin dominio verificado en Resend solo se puede enviar desde onboarding@resend.dev (y a tu propio correo).
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "Empleos FUNDAP <onboarding@resend.dev>", ...msg }),
    });
    if (!res.ok) console.error("[email] Resend respondió", res.status, await res.text());
  } catch (e) {
    console.error("[email] fallo de red", e);
  }
}

/**
 * URL pública para enlaces en correos. Nunca se toma del encabezado Host (se podría falsificar
 * para robar enlaces de acceso): SITE_URL o el dominio de producción que define Vercel.
 */
export const siteUrl = () =>
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
