import Link from "next/link";
import { getActor } from "@/server/auth";
import { can } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { getVacancy } from "@/server/modules/vacancies/queries";
import { STATUS_LABEL, TRANSITIONS, transitionsFrom } from "@/server/modules/vacancies/transitions";
import { todayGT } from "@/server/lib/businessDays";
import { AgingBadge } from "@/components/admin/AgingBadge";
import { PromotionForm, TransitionForm } from "@/components/admin/forms";
import { Badge, buttonClass, Card, EmptyState } from "@/components/ui";
import { addPromotionAction, removePromotionAction, transitionAction } from "../../actions";

const fmt = (d: Date, time = false) =>
  d.toLocaleString("es-GT", {
    timeZone: time ? "America/Guatemala" : "UTC",
    day: "2-digit", month: "short", year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

export default async function VacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  const v = await getVacancy(actor, (await params).id);
  const actions = transitionsFrom(v.status).filter((k) => can(actor, TRANSITIONS[k].permission, v));
  const canPromote = can(actor, "promotion.write", v);
  const [channels, partners] = canPromote
    ? await Promise.all([
        db.promotionChannel.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
        db.partner.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/plazas" className="text-sm text-brand-600 hover:underline">← Control de plazas</Link>
          <h1 className="mt-1 text-2xl font-bold">{v.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{STATUS_LABEL[v.status]}</Badge>
            {v.status !== "CLOSED" && v.status !== "ARCHIVED" && <AgingBadge aging={v.aging} />}
            <Badge>Prioridad {v.priority}</Badge>
          </div>
        </div>
        {can(actor, "vacancy.update", v) && (
          <Link href={`/admin/plazas/${v.id}/editar`} className={buttonClass("secondary")}>Editar</Link>
        )}
      </div>

      {actions.length > 0 && (
        <Card className="flex flex-wrap gap-4">
          {actions.map((k) => (
            <TransitionForm key={k} action={transitionAction} id={v.id} transition={k}
              label={TRANSITIONS[k].label} needsReason={TRANSITIONS[k].reason} />
          ))}
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold">Resumen</h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Programa", v.program.name],
            ["Área", v.area?.name ?? "Sin definir"],
            ["Sedes", v.branches.map((b) => `${b.branch.name} (${b.positions})`).join(", ")],
            ["Responsable", v.owner?.name ?? "—"],
            ["Posiciones cubiertas", `${v._count.hires} de ${v.positions}`],
            ["Requerida", fmt(v.requestedAt)],
            ["Cierre", v.closesAt ? fmt(v.closesAt) : "—"],
            ["Visibilidad", { PUBLIC: "Pública", INTERNAL: "Interna", UNPUBLISHED: "No publicar" }[v.visibility]],
            ["Días hábiles abiertos", `${v.aging.days} de ${v.aging.limit}`],
          ].map(([k, val]) => (
            <div key={k}><dt className="text-muted">{k}</dt><dd className="font-medium">{val}</dd></div>
          ))}
        </dl>
        {v.slug && v.visibility === "PUBLIC" && (
          <p className="mt-4 text-sm">
            Página pública: <Link href={`/empleos/${v.slug}`} className="text-brand-600 underline">/empleos/{v.slug}</Link>
          </p>
        )}
        {v.observations && <p className="mt-4 text-sm text-muted">{v.observations}</p>}
      </Card>

      <Card id="promocion">
        <h2 className="mb-3 font-semibold">Promoción</h2>
        {v.promotions.length === 0 ? (
          <EmptyState title="Sin registros de promoción" />
        ) : (
          <ul className="mb-4 divide-y divide-line text-sm">
            {v.promotions.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <strong>{p.channel.name}</strong>
                  {p.partner && ` · ${p.partner.name}`} · {fmt(p.promotedAt)}
                  {p.costGtq && ` · Q${p.costGtq.toString()}`}
                  {p.responsible && <span className="text-muted"> · {p.responsible.name}</span>}
                  {p.url && <> · <a href={p.url} className="text-brand-600 underline" target="_blank" rel="noreferrer">evidencia</a></>}
                </span>
                {canPromote && (
                  <form action={removePromotionAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-danger hover:underline">Retirar</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {canPromote && (
          <div className="mt-4 border-t border-line pt-4">
            <PromotionForm action={addPromotionAction} vacancyId={v.id} channels={channels} partners={partners} today={todayGT()} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Historial</h2>
        <ol className="space-y-2 text-sm">
          {v.statusEvents.map((e) => (
            <li key={e.id}>
              <span className="text-muted">{fmt(e.createdAt, true)}</span> ·{" "}
              {e.fromStatus ? `${STATUS_LABEL[e.fromStatus]} → ` : "Creada como "}
              <strong>{STATUS_LABEL[e.toStatus]}</strong> · {e.actor?.name ?? "Sistema"}
              {e.reason && <span className="text-muted"> — {e.reason}</span>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
