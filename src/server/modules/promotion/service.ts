import { z } from "zod";
import { db } from "@/server/db";
import { authorize, type Actor } from "@/server/auth/permissions";
import { audit } from "@/server/modules/audit/service";
import { AppError } from "@/server/lib/result";

const opt = z.string().trim().transform((s) => s || undefined).optional();

const addPromotionSchema = z.object({
  vacancyId: z.string().min(1),
  channelId: z.string().min(1, "Elige el canal"),
  partnerId: opt,
  promotedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  costGtq: z.literal("").transform(() => undefined).or(z.coerce.number().min(0, "No puede ser negativo")).optional(), // "" no es 0
  url: z.url({ protocol: /^https?$/, error: "Usa un enlace http(s)" }).optional().or(z.literal("").transform(() => undefined)),
  notes: opt,
});

async function vacancyFor(actor: Actor, vacancyId: string) {
  const v = await db.vacancy.findUnique({ where: { id: vacancyId }, select: { id: true, ownerId: true } });
  if (!v) throw new AppError("NOT_FOUND", "La plaza no existe.");
  authorize(actor, "promotion.write", v);
  return v;
}

export async function addPromotion(actor: Actor, input: unknown) {
  const f = addPromotionSchema.parse(input);
  await vacancyFor(actor, f.vacancyId);
  return db.$transaction(async (tx) => {
    const p = await tx.vacancyPromotion.create({
      data: {
        vacancyId: f.vacancyId,
        channelId: f.channelId,
        partnerId: f.partnerId,
        promotedAt: new Date(f.promotedAt + "T00:00:00Z"),
        costGtq: f.costGtq,
        url: f.url,
        notes: f.notes,
        responsibleId: actor.id,
      },
    });
    await audit(tx, actor, "promotion.add", "vacancy", f.vacancyId, { promotionId: p.id });
    return p;
  });
}

/** Nunca se borra: se marca como retirada. */
export async function removePromotion(actor: Actor, promotionId: string) {
  const p = await db.vacancyPromotion.findUnique({ where: { id: promotionId } });
  if (!p) throw new AppError("NOT_FOUND", "El registro no existe.");
  await vacancyFor(actor, p.vacancyId);
  await db.$transaction(async (tx) => {
    await tx.vacancyPromotion.update({ where: { id: promotionId }, data: { removedAt: new Date() } });
    await audit(tx, actor, "promotion.remove", "vacancy", p.vacancyId, { promotionId });
  });
}

const partnerSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre"),
  kind: opt,
  notes: opt,
  contactName: opt,
  contactPhone: opt,
  contactEmail: z.string().trim().email("Correo inválido").optional().or(z.literal("").transform(() => undefined)),
});

export async function createPartner(actor: Actor, input: unknown) {
  authorize(actor, "partner.write");
  const f = partnerSchema.parse(input);
  if (await db.partner.findUnique({ where: { name: f.name } }))
    throw new AppError("CONFLICT", "Ya existe un aliado con ese nombre.");
  return db.$transaction(async (tx) => {
    const p = await tx.partner.create({
      data: {
        name: f.name,
        kind: f.kind,
        notes: f.notes,
        contacts: f.contactName
          ? { create: { name: f.contactName, phone: f.contactPhone, email: f.contactEmail } }
          : undefined,
      },
    });
    await audit(tx, actor, "partner.create", "partner", p.id);
    return p;
  });
}
