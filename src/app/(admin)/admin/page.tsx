import Link from "next/link";
import { getActor } from "@/server/auth";
import { getDashboard } from "@/server/modules/reports/dashboard";
import { AgingBadge } from "@/components/admin/AgingBadge";
import { Card, EmptyState } from "@/components/ui";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function DashboardPage() {
  const d = await getDashboard(await getActor());
  const kpis = [
    { label: "Plazas abiertas", value: d.openCount },
    { label: "Posiciones por cubrir", value: d.openPositions },
    { label: "Por vencer", value: d.aging.DUE_SOON },
    { label: "Vencidas", value: d.aging.OVERDUE },
  ];
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-sm text-muted">{k.label}</p>
            <p className="mt-1 text-3xl font-bold">{k.value}</p>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Plazas que requieren atención</h2>
          {d.overdue.length === 0 ? (
            <EmptyState title="Todo en tiempo" />
          ) : (
            <ul className="divide-y divide-line">
              {d.overdue.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/admin/plazas/${v.id}`} className="min-w-0 truncate text-sm hover:underline">
                    {v.title} <span className="text-muted">· {v.program.name}</span>
                  </Link>
                  <AgingBadge aging={v.aging} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Activas sin promoción (más de 3 días hábiles)</h2>
          {d.withoutPromotion.length === 0 ? (
            <EmptyState title="Todas las plazas activas tienen promoción" />
          ) : (
            <ul className="divide-y divide-line">
              {d.withoutPromotion.map((v) => (
                <li key={v.id} className="py-2 text-sm">
                  <Link href={`/admin/plazas/${v.id}#promocion`} className="hover:underline">{v.title}</Link>
                  <span className="text-muted"> · {v.owner?.name ?? "Sin responsable"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Conversión por etapa · {d.year}</h2>
        {/* Barras con tabla accesible: el número siempre está en texto. */}
        <table className="w-full text-sm">
          <caption className="sr-only">Aplicaciones que alcanzaron cada etapa</caption>
          <tbody>
            {d.funnel.map((f) => (
              <tr key={f.name}>
                <th scope="row" className="w-48 py-1 pr-3 text-left font-medium">{f.name}</th>
                <td className="py-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 rounded bg-brand-600" style={{ width: `${d.funnel[0].count ? (f.count / d.funnel[0].count) * 100 : 0}%` }} />
                    <span className="tabular-nums">{f.count}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-3 font-semibold">Requerimientos por mes · {d.year}</h2>
        <table className="w-full text-sm">
          <caption className="sr-only">Requerimientos recibidos por mes y programa</caption>
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Programa</th>
              {MONTHS.map((m) => <th key={m} scope="col" className="px-2 py-2 text-right font-medium">{m}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {d.byProgram.map((p) => (
              <tr key={p.program}>
                <th scope="row" className="py-2 pr-4 text-left font-medium">{p.program}</th>
                {p.counts.map((c, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{c || ""}</td>)}
              </tr>
            ))}
            <tr className="font-semibold">
              <th scope="row" className="py-2 pr-4 text-left">Total</th>
              {d.months.map((c, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{c}</td>)}
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
