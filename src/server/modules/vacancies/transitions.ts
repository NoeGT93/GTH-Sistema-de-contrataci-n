import type { VacancyStatus } from "@prisma/client";
import type { Action } from "@/server/auth/permissions";

// Tabla de transiciones de la vacante (sección "Estados y transiciones").
export const TRANSITIONS = {
  approve: { from: ["PENDING_APPROVAL"], to: "DRAFT", permission: "vacancy.approve", reason: false, label: "Aprobar" },
  publish: { from: ["DRAFT", "PAUSED"], to: "ACTIVE", permission: "vacancy.publish", reason: false, label: "Publicar" },
  pause: { from: ["ACTIVE"], to: "PAUSED", permission: "vacancy.pause", reason: true, label: "Pausar" },
  close: { from: ["ACTIVE", "PAUSED"], to: "CLOSED", permission: "vacancy.close", reason: true, label: "Cerrar" },
  reactivate: { from: ["CLOSED"], to: "ACTIVE", permission: "vacancy.reactivate", reason: true, label: "Reactivar" },
  archive: { from: ["CLOSED"], to: "ARCHIVED", permission: "vacancy.archive", reason: false, label: "Archivar" },
} as const satisfies Record<
  string,
  { from: VacancyStatus[]; to: VacancyStatus; permission: Action; reason: boolean; label: string }
>;

export type TransitionKey = keyof typeof TRANSITIONS;

export const transitionsFrom = (status: VacancyStatus) =>
  (Object.keys(TRANSITIONS) as TransitionKey[]).filter((k) =>
    (TRANSITIONS[k].from as readonly VacancyStatus[]).includes(status),
  );

export const STATUS_LABEL: Record<VacancyStatus, string> = {
  PENDING_APPROVAL: "Pendiente de aprobación",
  DRAFT: "Borrador",
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  CLOSED: "Cerrada",
  ARCHIVED: "Archivada",
};
