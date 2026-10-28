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
      body: JSON.stringify({ from: process.env.EMAIL_FROM, ...msg }),
    });
    if (!res.ok) console.error("[email] Resend respondió", res.status, await res.text());
  } catch (e) {
    console.error("[email] fallo de red", e);
  }
}

export const siteUrl = () => process.env.SITE_URL ?? "http://localhost:3000";
