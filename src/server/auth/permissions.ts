import type { Role } from "@prisma/client";
import { AppError } from "@/server/lib/result";

export type Actor = { id: string; role: Role; name: string; email: string };

type Scope = "all" | "own";

// Matriz de permisos (sección "Roles y permisos"). "own" = plazas donde el actor es responsable.
// Lo que no aparece está denegado. Fases 1B/1C agregan sus acciones aquí.
const MATRIX = {
  "vacancy.read": { SUPERADMIN: "all", HR_COORDINATOR: "all", TALENT_ADVISOR: "all", MARKETING: "all" },
  "vacancy.create": { SUPERADMIN: "all", HR_COORDINATOR: "all", TALENT_ADVISOR: "all" },
  "vacancy.update": { SUPERADMIN: "all", HR_COORDINATOR: "all", TALENT_ADVISOR: "own" },
  "vacancy.approve": { SUPERADMIN: "all", HR_COORDINATOR: "all" },
  "vacancy.publish": { SUPERADMIN: "all", HR_COORDINATOR: "all", TALENT_ADVISOR: "own" },
  "vacancy.pause": { SUPERADMIN: "all", HR_COORDINATOR: "all", TALENT_ADVISOR: "own" },
  "vacancy.close": { SUPERADMIN: "all", HR_COORDINATOR: "all", TALENT_ADVISOR: "own" },
  "vacancy.reactivate": { SUPERADMIN: "all", HR_COORDINATOR: "all" },
  "vacancy.archive": { SUPERADMIN: "all", HR_COORDINATOR: "all" },
  "promotion.write": { SUPERADMIN: "all", HR_COORDINATOR: "all", TALENT_ADVISOR: "own", MARKETING: "all" },
  "partner.write": { SUPERADMIN: "all", HR_COORDINATOR: "all", TALENT_ADVISOR: "all", MARKETING: "all" },
  "report.read": { SUPERADMIN: "all", HR_COORDINATOR: "all", TALENT_ADVISOR: "own", MARKETING: "all", MANAGEMENT: "all" },
  "catalog.write": { SUPERADMIN: "all", HR_COORDINATOR: "all" },
  "user.write": { SUPERADMIN: "all" },
} satisfies Record<string, Partial<Record<Role, Scope>>>;

export type Action = keyof typeof MATRIX;

export function can(actor: Actor, action: Action, resource?: { ownerId?: string | null }): boolean {
  const scope = (MATRIX[action] as Partial<Record<Role, Scope>>)[actor.role];
  if (scope === "all") return true;
  if (scope === "own") return resource === undefined || resource.ownerId === actor.id;
  return false;
}

/** Única puerta de permisos. Sin `resource`, "own" significa "puede sobre alguna". */
export function authorize(actor: Actor, action: Action, resource?: { ownerId?: string | null }): void {
  if (!can(actor, action, resource)) throw new AppError("FORBIDDEN", "No tienes permiso para esta acción.");
}
