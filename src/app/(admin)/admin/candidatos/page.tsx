import Link from "next/link";
import { getActor } from "@/server/auth";
import { authorize, can } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { listCandidates } from "@/server/modules/candidates/queries";
import { ManualApplicationForm } from "@/components/admin/forms";
import { Badge, buttonClass, Card, EmptyState } from "@/components/ui";
import { manualApplicationAction } from "../actions";

export const metadata = { title: "Candidatos" };

type Search = { q?: string; vacancyId?: string; stageKey?: string };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const actor = await getActor();
  authorize(actor, "candidate.read");
  const f = await searchParams;
  const [rows, vacancies, stages] = await Promise.all([
    listCandidates(actor, f),
    db.vacancy.findMany({
      where: { status: { in: ["ACTIVE", "PAUSED", "DRAFT"] }, ...(actor.role === "TALENT_ADVISOR" ? { ownerId: actor.id } : {}) },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    db.pipelineStage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const control = "rounded-[var(--radius-control)] border border-line bg-white px-3 py-2 text-sm";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Candidatos</h1>
      <form className="flex flex-wrap gap-2" aria-label="Filtros">
        <input name="q" defaultValue={f.q} placeholder="Nombre, teléfono o correo" aria-label="Buscar" className={control} />
        <select name="vacancyId" defaultValue={f.vacancyId ?? ""} aria-label="Plaza" className={control}>
          <option value="">Todas las plazas</option>
          {vacancies.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
        </select>
        <select name="stageKey" defaultValue={f.stageKey ?? ""} aria-label="Etapa" className={control}>
          <option value="">Todas las etapas</option>
          {stages.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
        </select>
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No hay candidatos con estos filtros" />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card-sm)] border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-brand-900">
              <tr>{["Nombre", "Teléfono", "Aplicaciones"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-brand-50/50">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/admin/candidatos/${c.id}`} className="hover:underline">{c.firstName} {c.lastName}</Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{c.phone}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.applications.map((a) => (
                        <Badge key={a.id} tone={a.stage.category === "ACTIVE" ? "neutral" : a.stage.category === "HIRED" ? "success" : "warning"}>
                          {a.vacancy.title} · {a.stage.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {can(actor, "application.create") && vacancies.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Registrar aplicación (feria, referido, aliado)</h2>
          <ManualApplicationForm action={manualApplicationAction} vacancies={vacancies.map((v) => ({ id: v.id, name: v.title }))} />
        </Card>
      )}
    </div>
  );
}
