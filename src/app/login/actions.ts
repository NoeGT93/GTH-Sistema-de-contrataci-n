"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { authSecret, createLinkToken, LINK_TTL_MIN } from "@/server/auth/magicLink";
import { sendEmail, siteUrl } from "@/server/integrations/email";

export type LinkState = { sent?: boolean; error?: string } | null;

const MAX_PER_WINDOW = 3;

/** Envía el enlace de acceso. Responde igual exista o no el correo (no revela quién tiene cuenta). */
export async function requestLoginLink(_: LinkState, fd: FormData): Promise<LinkState> {
  const parsed = z.email().safeParse(String(fd.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { error: "Escribe un correo válido." };
  const email = parsed.data;
  const secret = authSecret();
  if (!secret) return { error: "El sistema aún no tiene base de datos configurada." };

  const user = await db.user.findUnique({ where: { email } });
  if (user?.active) {
    const recent = await db.auditLog.count({
      where: { action: "auth.link_sent", actorId: user.id, createdAt: { gte: new Date(Date.now() - LINK_TTL_MIN * 60_000) } },
    });
    if (recent >= MAX_PER_WINDOW) return { error: `Ya enviamos varios enlaces. Revisa tu correo o espera ${LINK_TTL_MIN} minutos.` };
    const link = `${siteUrl()}/login/verificar?token=${encodeURIComponent(createLinkToken(email, secret))}`;
    await sendEmail({
      to: email,
      subject: "Tu enlace para entrar a FUNDAP Talento",
      text: `Hola ${user.name}:\n\nEntra al panel con este enlace (vence en ${LINK_TTL_MIN} minutos y sirve una sola vez):\n${link}\n\nSi no lo pediste, ignora este correo.`,
    });
    await db.auditLog.create({ data: { actorId: user.id, action: "auth.link_sent", entityType: "user", entityId: user.id } });
  }
  return { sent: true };
}
