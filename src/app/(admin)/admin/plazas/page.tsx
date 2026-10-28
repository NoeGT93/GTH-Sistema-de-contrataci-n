import Link from "next/link";
import { getActor } from "@/server/auth";
import { can } from "@/server/auth/permissions";
import { getFormCatalogs, listVacancies } from "@/server/modules/vacancies/queries";
import { STATUS_LABEL } from "@/server/modules/vacancies/transitions";
import { AgingBadge } from "@/components/admin/AgingBadge";
import { Badge, buttonClass, EmptyState } from "@/components/ui";

export const metadata = { title: "Control de plazas" };

const fmt = (d: Date) => d.toLocaleDateString("es-GT", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });

export default async function VacanciesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await getActor();
  const filters = await searchParams;
  const [rows, catalogs] = await Promise.all([listVacancies(actor, filters), getFormCatalogs()]);
  const select = "rounded-[var(--radius-control)] border border-line bg-white px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Control de plazas</h1>
        {can(actor, "vacancy.create") && <Link href="/admin/plazas/nueva" className={buttonClass()}>Nuevo requerimiento</Link>}
      </div>

      {/* Filtros en la URL: se pueden compartir y guardar. */}
      <form className="flex flex-wrap gap-2" aria-label="Filtros">
        <input name="q" defaultValue={filters.q} placeholder="Buscar puesto" aria-label="Buscar puesto" className={select} />
        <select name="status" defaultValue={filters.status ?? ""} aria-label="Estado" className={select}>
          <option value="">Abiertas y cerradas</option>
          {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select name="programId" defaultValue={filters.programId ?? ""} aria-label="Programa" className={select}>
          <option value="">Todos los programas</option>
          {catalogs.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select name="branchId" defaultValue={filters.branchId ?? ""} aria-label="Sucursal" className={select}>
          <option value="">Todas las sucursales</option>
          {catalogs.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select name="ownerId" defaultValue={filters.ownerId ?? ""} aria-label="Responsable" className={select}>
          <option value="">Todos los responsables</option>
          {catalogs.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No hay plazas con estos filtros" />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card-sm)] border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-brand-900">
              <tr>
                {["Puesto", "Sucursal", "Programa", "Responsable", "Requerida", "Prio.", "Cubiertas", "Promoción", "Estado", "Plazo"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((v) => (
                <tr key={v.id} className="h-10 hover:bg-brand-50/50">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/admin/plazas/${v.id}`} className="hover:underline">{v.title}</Link>
                  </td>
                  <td className="px-3 py-2">{v.branches.map((b) => b.branch.name).join(", ")}</td>
                  <td className="px-3 py-2">{v.program.name}</td>
                  <td className="px-3 py-2">{v.owner?.name ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(v.requestedAt)}</td>
                  <td className="px-3 py-2">{v.priority}</td>
                  <td className="px-3 py-2 tabular-nums">{v._count.hires}/{v.positions}</td>
                  <td className="px-3 py-2 tabular-nums">{v._count.promotions}</td>
                  <td className="px-3 py-2"><Badge>{STATUS_LABEL[v.status]}</Badge></td>
                  <td className="px-3 py-2">
                    {v.status === "CLOSED" ? <span className="text-muted">{v.aging.days} d</span> : <AgingBadge aging={v.aging} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
