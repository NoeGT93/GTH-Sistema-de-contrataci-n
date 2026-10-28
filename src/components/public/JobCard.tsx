import Link from "next/link";
import type { PublicVacancy } from "@/server/modules/vacancies/queries";

export const MODALITY_LABEL = { ONSITE: "Presencial", HYBRID: "Híbrida", REMOTE: "Remota", FIELD: "Campo" } as const;

export function JobCard({ v }: { v: PublicVacancy }) {
  return (
    <Link
      href={`/empleos/${v.slug}`}
      className="block rounded-[var(--radius-card)] border border-line bg-white p-6 transition hover:border-brand-400 hover:shadow-md"
    >
      {v.area && <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">{v.area.name}</p>}
      <h3 className="mt-1 text-lg font-bold">{v.title}</h3>
      <p className="mt-1 text-sm text-muted">
        {v.branches.map((b) => b.branch.name).join(", ")} · {MODALITY_LABEL[v.modality]}
      </p>
      {v.summary && <p className="mt-3 line-clamp-2 text-sm">{v.summary}</p>}
    </Link>
  );
}
