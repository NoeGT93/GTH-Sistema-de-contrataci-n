import { db } from "@/server/db";
import { listPublicVacancies } from "@/server/modules/vacancies/queries";
import { JobCard, MODALITY_LABEL } from "@/components/public/JobCard";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Vacantes" };

type Search = { area?: string; sede?: string; modalidad?: string; q?: string };

export default async function JobsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const f = await searchParams;
  const [jobs, areas, branches] = await Promise.all([
    listPublicVacancies(f),
    db.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.branch.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const control = "rounded-[var(--radius-control)] border border-line bg-white px-3 py-2 text-sm";
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Vacantes</h1>
      <form className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(3,180px)_auto]" aria-label="Filtros">
        <input name="q" defaultValue={f.q} placeholder="Puesto" aria-label="Puesto" className={control} />
        <select name="area" defaultValue={f.area ?? ""} aria-label="Área" className={control}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}
        </select>
        <select name="sede" defaultValue={f.sede ?? ""} aria-label="Sede" className={control}>
          <option value="">Todas las sedes</option>
          {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
        <select name="modalidad" defaultValue={f.modalidad ?? ""} aria-label="Modalidad" className={control}>
          <option value="">Cualquier modalidad</option>
          {Object.entries(MODALITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button className={buttonClass()}>Filtrar</button>
      </form>
      <p aria-live="polite" className="mt-6 text-sm text-muted">{jobs.length} vacantes</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((v) => <JobCard key={v.slug} v={v} />)}
      </div>
    </div>
  );
}
