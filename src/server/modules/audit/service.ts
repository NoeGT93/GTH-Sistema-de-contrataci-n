import type { Prisma } from "@prisma/client";
import type { Tx } from "@/server/db";
import type { Actor } from "@/server/auth/permissions";

export function audit(
  tx: Tx,
  actor: Actor | null,
  action: string,
  entityType: string,
  entityId: string,
  data?: Prisma.InputJsonValue,
) {
  return tx.auditLog.create({ data: { actorId: actor?.id, action, entityType, entityId, data } });
}
