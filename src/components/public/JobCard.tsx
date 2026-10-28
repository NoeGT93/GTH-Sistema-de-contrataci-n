import Link from "next/link";
import type { PublicVacancy } from "@/server/modules/vacancies/queries";
import { buttonClass } from "@/components/ui";

export const MODALITY_LABEL = { ONSITE: "Oficina", HYBRID: "Híbrido", REMOTE: "Remoto", FIELD: "Campo" } as const;

/** Días de calendario hasta el cierre (fechas "YYYY-MM-DD"). */
export function daysLeft(closesAt: Date | string | null, today: string): number | null {
  if (!closesAt) return null;
  const iso = typeof closesAt === "string" ? closesAt.slice(0, 10) : closesAt.toISOString().slice(0, 10);
  return Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);
}

export function closingText(days: number | null) {
  if (days === null) return null;
  return days <= 0 ? "Cierra hoy" : days === 1 ? "Cierra mañana" : `Cierra en ${days} días`;
}

const Pin = () => (
  <svg aria-hidden className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" />
  </svg>
);

export function JobCard({ v, today }: { v: PublicVacancy; today: string }) {
  const closing = closingText(daysLeft(v.closesAt, today));
  return (
    <article className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#c6dce9] hover:shadow-[var(--shadow-soft)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap gap-2">
          {v.area && <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800">{v.area.name}</span>}
          <span className="rounded-full bg-[#f4f7f9] px-3 py-1.5 text-xs font-bold text-brand-800">{MODALITY_LABEL[v.modality]}</span>
        </div>
        <h3 className="text-lg font-bold tracking-tight">{v.title}</h3>
        {v.summary && <p className="mt-1 text-sm text-muted">{v.summary}</p>}
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted"><Pin />{v.branches.map((b) => b.branch.name).join(", ")}</p>
        {closing && <p className="mt-3 text-xs font-bold text-warning">{closing}</p>}
      </div>
      <Link href={`/empleos/${v.slug}`} className={buttonClass()}>
        Ver vacante<span className="sr-only">: {v.title}</span>
      </Link>
    </article>
  );
}
