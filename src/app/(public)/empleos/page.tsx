import Link from "next/link";
import { db } from "@/server/db";
import { listPublicVacancies } from "@/server/modules/vacancies/queries";
import { todayGT } from "@/server/lib/businessDays";
import { JobCard, MODALITY_LABEL } from "@/components/public/JobCard";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Vacantes" };

type Search = { area?: string; sede?: string; modalidad?: string; q?: string; orden?: string };

const control = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm";
const label = "mb-2 block text-xs font-extrabold";

export default async function JobsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const f = await searchParams;
  const [jobs, areas, branches] = await Promise.all([
    listPublicVacancies(f),
    db.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.branch.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-[1180px] px-4 py-10 md:px-6 md:py-14">
        <p className="eyebrow">Vacantes</p>
        <h1 className="mt-2 text-[clamp(1.9rem,3.2vw,2.85rem)] leading-tight font-bold tracking-[-0.035em]">Encuentra tu próxima oportunidad.</h1>

        {/* Filtros en la URL (?area=&sede=&modalidad=&q=&orden=): se pueden compartir. */}
        <form className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside aria-label="Filtros de vacantes" className="h-max divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white p-5 lg:sticky lg:top-24">
            <div className="pb-3.5">
              <label htmlFor="q" className={label}>Palabra clave</label>
              <input id="q" name="q" defaultValue={f.q} placeholder="Ej. asesor, salud…" className={control} />
            </div>
            <div className="py-3.5">
              <label htmlFor="area" className={label}>Área</label>
              <select id="area" name="area" defaultValue={f.area ?? ""} className={control}>
                <option value="">Todas</option>
                {areas.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}
              </select>
            </div>
            <div className="py-3.5">
              <label htmlFor="sede" className={label}>Ubicación</label>
              <select id="sede" name="sede" defaultValue={f.sede ?? ""} className={control}>
                <option value="">Todas</option>
                {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div className="py-3.5">
              <label htmlFor="modalidad" className={label}>Modalidad</label>
              <select id="modalidad" name="modalidad" defaultValue={f.modalidad ?? ""} className={control}>
                <option value="">Cualquiera</option>
                {Object.entries(MODALITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div className="grid gap-2 pt-3.5">
              <button className={buttonClass()}>Aplicar filtros</button>
              <Link href="/empleos" className={buttonClass("secondary")}>Limpiar filtros</Link>
            </div>
          </aside>

          <div>
            <div className="mb-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p aria-live="polite" className="font-bold">{jobs.length} {jobs.length === 1 ? "vacante" : "vacantes"}</p>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted">Ordenar</span>
                <select name="orden" defaultValue={f.orden ?? "recientes"} className="rounded-xl border border-line bg-white px-3 py-2.5">
                  <option value="recientes">Más recientes</option>
                  <option value="cierre">Próximas a cerrar</option>
                  <option value="az">A–Z</option>
                </select>
              </label>
            </div>
            {jobs.length === 0 ? (
              <p className="rounded-[var(--radius-card)] border border-dashed border-line bg-white p-12 text-center text-muted">
                <strong className="block text-ink">No encontramos vacantes con estos filtros.</strong>
                Prueba otra combinación o descubre tu <Link href="/#match" className="text-brand-600 underline">Match de Impacto</Link>.
              </p>
            ) : (
              <div className="grid gap-3.5">{jobs.map((v) => <JobCard key={v.slug} v={v} today={todayGT()} />)}</div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
