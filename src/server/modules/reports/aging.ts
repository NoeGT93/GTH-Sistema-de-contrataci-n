import type { Priority } from "@prisma/client";
import { businessDays, todayGT, type DateLike } from "@/server/lib/businessDays";
import { db } from "@/server/db";

export type AgingSettings = { priorityDays: Record<Priority, number>; dueSoonDays: number };
export type AgingStatus = "ON_TIME" | "DUE_SOON" | "OVERDUE";
export type Aging = { days: number; limit: number; status: AgingStatus };

export const DEFAULT_AGING: AgingSettings = { priorityDays: { A: 15, B: 30, C: 45 }, dueSoonDays: 5 };

/** Estado del plazo: reemplaza el semáforo del Excel. */
export function computeAging(
  v: { priority: Priority; requestedAt: DateLike; closedAt?: DateLike | null },
  holidays: ReadonlySet<string>,
  settings: AgingSettings = DEFAULT_AGING,
  today: string = todayGT(),
): Aging {
  const days = businessDays(v.requestedAt, v.closedAt ?? today, holidays);
  const limit = settings.priorityDays[v.priority];
  const status = days > limit ? "OVERDUE" : limit - days <= settings.dueSoonDays ? "DUE_SOON" : "ON_TIME";
  return { days, limit, status };
}

/** Feriados y umbrales vigentes (umbrales editables en `settings` sin tocar código). */
export async function loadAgingContext() {
  const [holidays, setting] = await Promise.all([
    db.holiday.findMany({ select: { date: true } }),
    db.setting.findUnique({ where: { key: "aging" } }),
  ]);
  return {
    holidays: new Set(holidays.map((h) => h.date.toISOString().slice(0, 10))),
    settings: { ...DEFAULT_AGING, ...(setting?.value as Partial<AgingSettings> | undefined) },
  };
}
