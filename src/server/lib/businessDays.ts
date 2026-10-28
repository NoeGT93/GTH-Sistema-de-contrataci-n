// Días hábiles reales: lunes a viernes menos feriados. Cuenta el día inicial,
// igual que NETWORKDAYS del Excel. Fechas como "YYYY-MM-DD" o Date (UTC).

export type DateLike = Date | string;

export const toISODate = (d: DateLike) =>
  typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);

/** Hoy en Guatemala (UTC-6, sin horario de verano). */
export const todayGT = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(new Date());

export function businessDays(from: DateLike, to: DateLike, holidays: ReadonlySet<string>): number {
  const end = new Date(toISODate(to) + "T00:00:00Z");
  let count = 0;
  for (const d = new Date(toISODate(from) + "T00:00:00Z"); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6 && !holidays.has(d.toISOString().slice(0, 10))) count++;
  }
  return count;
}

export function addCalendarDays(d: DateLike, days: number): string {
  const r = new Date(toISODate(d) + "T00:00:00Z");
  r.setUTCDate(r.getUTCDate() + days);
  return r.toISOString().slice(0, 10);
}
