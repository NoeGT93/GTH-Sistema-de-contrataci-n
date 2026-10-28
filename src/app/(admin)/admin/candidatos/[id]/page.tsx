import Link from "next/link";
import { getActor } from "@/server/auth";
import { appResource, can } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { getCandidate } from "@/server/modules/candidates/queries";
import {
  AssignForm, InterviewForm, InterviewResultForm, MoveStageForm, NoteForm,
} from "@/components/admin/forms";
import { Badge, Card } from "@/components/ui";
import {
  addNoteAction, assignAction, interviewResultAction, moveApplicationAction, scheduleInterviewAction,
} from "../../actions";

const fmt = (d: Date) =>
  d.toLocaleString("es-GT", { timeZone: "America/Guatemala", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const KIND = { HR: "RR. HH.", MANAGEMENT: "Gerencia", FINAL: "Final" } as const;
const RESULT = { PENDING: "Pendiente", FAVORABLE: "Favorable", NOT_FAVORABLE: "No favorable", NO_SHOW: "No se presentó" } as const;

const answerText = (v: unknown) => (v === "yes" ? "Sí" : v === "no" ? "No" : String(v));

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  const c = await getCandidate(actor, (await params).id);
  const [stages, staff] = await Promise.all([
    db.pipelineStage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    can(actor, "application.assign")
      ? db.user.findMany({ where: { active: true, role: { in: ["HR_COORDINATOR", "TALENT_ADVISOR"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : [],
  ]);

  // Historial unificado: etapas, entrevistas y notas en orden cronológico inverso.
  const activity = [
    ...c.applications.flatMap((a) =>
      a.stageEvents.map((e) => ({ at: e.createdAt, text: `${a.vacancy.title}: ${e.toStage.name}${e.reason ? ` — ${e.reason}` : ""}`, by: e.actor?.name ?? "Candidato/Sistema" })),
    ),
    ...c.applications.flatMap((a) =>
      a.interviews.map((i) => ({ at: i.scheduledAt, text: `Entrevista ${KIND[i.kind]} (${a.vacancy.title}) · ${RESULT[i.result]}`, by: i.participants.map((p) => p.user.name).join(", ") })),
    ),
    ...c.notes.map((n) => ({ at: n.createdAt, text: `Nota: ${n.body}`, by: n.author.name })),
  ].sort((x, y) => y.at.getTime() - x.at.getTime());

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/candidatos" className="text-sm text-brand-600 hover:underline">← Candidatos</Link>
        <h1 className="mt-1 text-2xl font-bold">{c.firstName} {c.lastName}</h1>
        <p className="mt-1 text-sm">
          <a href={`tel:${c.phone}`} className="text-brand-600 underline">{c.phone}</a>
          {" · "}
          <a href={`https://wa.me/${c.phone.replace("+", "")}`} target="_blank" rel="noreferrer" className="text-brand-600 underline">WhatsApp</a>
          {c.email && <> · <a href={`mailto:${c.email}`} className="text-brand-600 underline">{c.email}</a></>}
        </p>
      </div>

      {c.applications.map((a) => {
        const canMove = can(actor, "application.move", appResource(a));
        const closed = a.stage.category !== "ACTIVE";
        const first = a.touches.find((t) => t.type === "FIRST");
        return (
          <Card key={a.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  <Link href={`/admin/plazas/${a.vacancy.id}`} className="hover:underline">{a.vacancy.title}</Link>
                </h2>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <Badge tone={closed ? (a.stage.category === "HIRED" ? "success" : "warning") : "neutral"}>{a.stage.name}</Badge>
                  {a.needsReview && <Badge tone="warning">Revisar respuestas</Badge>}
                  <span className="text-muted">Código {a.trackingCode} · Origen: {a.source ?? "—"}{first?.utmCampaign ? ` · Campaña ${first.utmCampaign}` : ""}</span>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                {a.cvFile && can(actor, "cv.download", appResource(a)) && (
                  <a href={`/api/files/${a.cvFile.id}`} className="font-semibold text-brand-600 underline">Descargar CV</a>
                )}
                <Link href={`/admin/pipeline?vacante=${a.vacancy.id}`} className="text-brand-600 underline">Pipeline</Link>
              </div>
            </div>

            {a.answers.length > 0 && (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {a.answers.map((ans) => (
                  <div key={ans.id} className={ans.mismatch ? "rounded-lg bg-warning/10 p-2" : "p-2"}>
                    <dt className="text-muted">{ans.question.prompt}</dt>
                    <dd className="font-medium">{answerText(ans.value)}{ans.mismatch && " · no coincide con lo esperado"}</dd>
                  </div>
                ))}
              </dl>
            )}
            {a.motivation && <p className="text-sm"><span className="text-muted">Motivación:</span> {a.motivation}</p>}

            {canMove && (!closed || can(actor, "application.reopen")) && (
              <MoveStageForm action={moveApplicationAction} id={a.id} current={a.stage.key} stages={stages} />
            )}
            {staff.length > 0 && <AssignForm action={assignAction} id={a.id} current={a.assignee?.id ?? ""} users={staff} />}

            {a.interviews.length > 0 && (
              <ul className="divide-y divide-line text-sm">
                {a.interviews.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <strong>{KIND[i.kind]}</strong> · {fmt(i.scheduledAt)}{i.location && ` · ${i.location}`} · {RESULT[i.result]}
                      {i.resultNotes && <span className="text-muted"> — {i.resultNotes}</span>}
                    </span>
                    {canMove && i.result === "PENDING" && <InterviewResultForm action={interviewResultAction} id={i.id} />}
                  </li>
                ))}
              </ul>
            )}
            {canMove && !closed && <InterviewForm action={scheduleInterviewAction} applicationId={a.id} />}
          </Card>
        );
      })}

      <div className="grid gap-6 lg:grid-cols-2">
        {can(actor, "candidate.write") && (
          <Card>
            <h2 className="mb-3 font-semibold">Notas</h2>
            <NoteForm action={addNoteAction} candidateId={c.id} applications={c.applications.map((a) => ({ id: a.id, name: a.vacancy.title }))} />
          </Card>
        )}
        <Card>
          <h2 className="mb-3 font-semibold">Actividad</h2>
          <ol className="space-y-2 text-sm">
            {activity.map((x, i) => (
              <li key={i}><span className="text-muted">{fmt(x.at)}</span> · {x.text} <span className="text-muted">· {x.by}</span></li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
