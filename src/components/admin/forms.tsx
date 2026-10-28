"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { Button, Field } from "@/components/ui";
import type { FormState } from "@/app/(admin)/admin/actions";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;
type Opt = { id: string; name: string };

/**
 * Envío sin el reinicio automático de React 19, para no perder lo escrito si hay errores.
 * El formulario se limpia solo cuando la acción sale bien.
 */
function useForm(action: Action) {
  const [state, dispatch, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, pending, form: { ref, onSubmit } };
}

const fieldErrors = (s: FormState) => (s && !s.ok ? s.error.fields ?? {} : {});

function FormError({ state }: { state: FormState }) {
  return (
    <p aria-live="polite" className="text-sm text-danger">
      {state && !state.ok ? state.error.message : ""}
    </p>
  );
}

export type VacancyDefaults = {
  id?: string; title?: string; programId?: string; areaId?: string | null; ownerId?: string | null;
  branchIds?: string[]; priority?: string; modality?: string; visibility?: string; positions?: number;
  requestedAt?: string; closesAt?: string; summary?: string | null; description?: string | null;
  requirements?: string | null; benefits?: string | null; salaryText?: string | null; observations?: string | null;
};

export function VacancyForm({
  action, defaults, catalogs, canAssignOwner,
}: {
  action: Action;
  defaults: VacancyDefaults;
  catalogs: { programs: Opt[]; areas: Opt[]; branches: Opt[]; owners: Opt[] };
  canAssignOwner: boolean;
}) {
  const { state, pending, form } = useForm(action);
  const e = fieldErrors(state);
  const d = defaults;
  return (
    <form {...form} className="space-y-6">
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 font-semibold">Requerimiento</legend>
        <Field label="Puesto" name="title" error={e.title}>{(a) => <input {...a} defaultValue={d.title} required />}</Field>
        <Field label="Programa que solicita" name="programId" error={e.programId}>
          {(a) => (
            <select {...a} defaultValue={d.programId ?? ""} required>
              <option value="" disabled>Elige…</option>
              {catalogs.programs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
        </Field>
        <Field label="Sedes" name="branchIds" error={e.branchIds} hint="Ctrl/Cmd + clic para elegir varias">
          {(a) => (
            <select {...a} multiple defaultValue={d.branchIds ?? []} size={5}>
              {catalogs.branches.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
        </Field>
        <div className="grid gap-4">
          <Field label="Posiciones" name="positions" error={e.positions}>
            {(a) => <input {...a} type="number" min={1} defaultValue={d.positions ?? 1} required />}
          </Field>
          <Field label="Fecha de requerimiento" name="requestedAt" error={e.requestedAt}>
            {(a) => <input {...a} type="date" defaultValue={d.requestedAt} required />}
          </Field>
        </div>
        <Field label="Prioridad" name="priority" error={e.priority} hint="A = 15, B = 30, C = 45 días hábiles">
          {(a) => (
            <select {...a} defaultValue={d.priority ?? "B"}>
              <option value="A">A</option><option value="B">B</option><option value="C">C</option>
            </select>
          )}
        </Field>
        {canAssignOwner && (
          <Field label="Responsable" name="ownerId" error={e.ownerId}>
            {(a) => (
              <select {...a} defaultValue={d.ownerId ?? ""}>
                <option value="">Yo</option>
                {catalogs.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
          </Field>
        )}
        <div className="md:col-span-2">
          <Field label="Observaciones internas" name="observations" error={e.observations}>
            {(a) => <textarea {...a} rows={2} defaultValue={d.observations ?? ""} />}
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 font-semibold">Publicación</legend>
        <Field label="Área (la ve el candidato)" name="areaId" error={e.areaId}>
          {(a) => (
            <select {...a} defaultValue={d.areaId ?? ""}>
              <option value="">Sin definir</option>
              {catalogs.areas.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
        </Field>
        <Field label="Visibilidad" name="visibility" error={e.visibility} hint="Solo las públicas llegan al portal">
          {(a) => (
            <select {...a} defaultValue={d.visibility ?? "PUBLIC"}>
              <option value="PUBLIC">Pública</option>
              <option value="INTERNAL">Interna</option>
              <option value="UNPUBLISHED">No publicar</option>
            </select>
          )}
        </Field>
        <Field label="Modalidad" name="modality" error={e.modality}>
          {(a) => (
            <select {...a} defaultValue={d.modality ?? "ONSITE"}>
              <option value="ONSITE">Presencial</option>
              <option value="FIELD">Campo</option>
              <option value="HYBRID">Híbrida</option>
              <option value="REMOTE">Remota</option>
            </select>
          )}
        </Field>
        <Field label="Fecha de cierre" name="closesAt" error={e.closesAt} hint="Obligatoria si es pública">
          {(a) => <input {...a} type="date" defaultValue={d.closesAt} />}
        </Field>
        <Field label="Resumen" name="summary" error={e.summary}>
          {(a) => <input {...a} defaultValue={d.summary ?? ""} maxLength={200} />}
        </Field>
        <Field label="Salario (texto público)" name="salaryText" error={e.salaryText}>
          {(a) => <input {...a} defaultValue={d.salaryText ?? ""} placeholder="Opcional" />}
        </Field>
        <div className="md:col-span-2 grid gap-4">
          <Field label="Descripción" name="description" error={e.description}>
            {(a) => <textarea {...a} rows={4} defaultValue={d.description ?? ""} />}
          </Field>
          <Field label="Requisitos" name="requirements" error={e.requirements} hint="Uno por línea. Sin requisitos de sexo, edad, religión, etnia o estado civil.">
            {(a) => <textarea {...a} rows={4} defaultValue={d.requirements ?? ""} />}
          </Field>
          <Field label="Beneficios" name="benefits" error={e.benefits} hint="Uno por línea">
            {(a) => <textarea {...a} rows={3} defaultValue={d.benefits ?? ""} />}
          </Field>
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <Button disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
        <FormError state={state} />
      </div>
    </form>
  );
}

export function TransitionForm({
  action, id, transition, label, needsReason, activeApplications = 0,
}: { action: Action; id: string; transition: string; label: string; needsReason: boolean; activeApplications?: number }) {
  const { state, pending, form } = useForm(action);
  return (
    <form {...form} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={transition} />
      {needsReason && (
        <input name="reason" required placeholder="Motivo" aria-label={`Motivo para ${label.toLowerCase()}`}
          className="rounded-[var(--radius-control)] border border-line px-3 py-2 text-sm" />
      )}
      {transition === "close" && activeApplications > 0 && (
        <select name="moveApplicationsTo" defaultValue="vacancy_closed" aria-label="Qué hacer con las aplicaciones activas"
          className="rounded-[var(--radius-control)] border border-line px-3 py-2 text-sm">
          <option value="vacancy_closed">{activeApplications} aplicaciones activas → Vacante cerrada</option>
          <option value="talent_pool">{activeApplications} aplicaciones activas → Base de talento</option>
          <option value="">Dejar las aplicaciones donde están</option>
        </select>
      )}
      <Button variant={transition === "close" ? "danger" : "secondary"} disabled={pending}>{label}</Button>
      <FormError state={state} />
    </form>
  );
}

export function PromotionForm({
  action, vacancyId, channels, partners, today,
}: { action: Action; vacancyId: string; channels: Opt[]; partners: Opt[]; today: string }) {
  const { state, pending, form } = useForm(action);
  const e = fieldErrors(state);
  return (
    <form {...form} className="grid gap-3 md:grid-cols-3">
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <Field label="Canal" name="channelId" error={e.channelId}>
        {(a) => (
          <select {...a} required defaultValue="">
            <option value="" disabled>Elige…</option>
            {channels.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Aliado" name="partnerId" error={e.partnerId}>
        {(a) => (
          <select {...a} defaultValue="">
            <option value="">Ninguno</option>
            {partners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Fecha" name="promotedAt" error={e.promotedAt}>
        {(a) => <input {...a} type="date" defaultValue={today} required />}
      </Field>
      <Field label="Costo (Q)" name="costGtq" error={e.costGtq}>
        {(a) => <input {...a} type="number" min={0} step="0.01" />}
      </Field>
      <Field label="Enlace o evidencia" name="url" error={e.url}>{(a) => <input {...a} type="url" />}</Field>
      <Field label="Notas" name="notes" error={e.notes}>{(a) => <input {...a} />}</Field>
      <div className="flex items-center gap-4 md:col-span-3">
        <Button disabled={pending}>Registrar promoción</Button>
        <FormError state={state} />
      </div>
    </form>
  );
}

export function PartnerForm({ action }: { action: Action }) {
  const { state, pending, form } = useForm(action);
  const e = fieldErrors(state);
  return (
    <form {...form} className="grid gap-3 md:grid-cols-3">
      <Field label="Nombre" name="name" error={e.name}>{(a) => <input {...a} required />}</Field>
      <Field label="Tipo" name="kind" error={e.kind}>{(a) => <input {...a} placeholder="Universidad, municipalidad…" />}</Field>
      <Field label="Notas" name="notes" error={e.notes}>{(a) => <input {...a} />}</Field>
      <Field label="Contacto" name="contactName" error={e.contactName}>{(a) => <input {...a} />}</Field>
      <Field label="Teléfono" name="contactPhone" error={e.contactPhone}>{(a) => <input {...a} type="tel" />}</Field>
      <Field label="Correo" name="contactEmail" error={e.contactEmail}>{(a) => <input {...a} type="email" />}</Field>
      <div className="flex items-center gap-4 md:col-span-3">
        <Button disabled={pending}>Agregar aliado</Button>
        <FormError state={state} />
      </div>
    </form>
  );
}

// ───────────── Candidatos y pipeline (1B) ─────────────

type Stage = { key: string; name: string; category: string; requiresReason: boolean };

export function MoveStageForm({ action, id, current, stages }: { action: Action; id: string; current: string; stages: Stage[] }) {
  const { state, pending, form } = useForm(action);
  return (
    <form {...form} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`stage-${id}`}>Mover a etapa</label>
      <select id={`stage-${id}`} name="stageKey" defaultValue={current} className="rounded-[var(--radius-control)] border border-line px-3 py-2 text-sm">
        {stages.map((s) => <option key={s.key} value={s.key}>{s.name}{s.requiresReason ? " (motivo)" : ""}</option>)}
      </select>
      <input name="reason" placeholder="Motivo (si aplica)" aria-label="Motivo"
        className="rounded-[var(--radius-control)] border border-line px-3 py-2 text-sm" />
      <Button variant="secondary" disabled={pending}>Mover</Button>
      <FormError state={state} />
    </form>
  );
}

export function AssignForm({ action, id, current, users }: { action: Action; id: string; current: string; users: Opt[] }) {
  const { state, pending, form } = useForm(action);
  return (
    <form {...form} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`assignee-${id}`}>Asignar a</label>
      <select id={`assignee-${id}`} name="assigneeId" defaultValue={current} className="rounded-[var(--radius-control)] border border-line px-3 py-2 text-sm">
        <option value="">Sin asignar</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <Button variant="secondary" disabled={pending}>Asignar</Button>
      <FormError state={state} />
    </form>
  );
}

export function InterviewForm({ action, applicationId }: { action: Action; applicationId: string }) {
  const { state, pending, form } = useForm(action);
  const e = fieldErrors(state);
  return (
    <form {...form} className="grid gap-3 sm:grid-cols-[160px_1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Field label="Entrevista" name={`kind-${applicationId}`} error={e.kind}>
        {(a) => (
          <select {...a} name="kind" defaultValue="HR">
            <option value="HR">RR. HH.</option><option value="MANAGEMENT">Gerencia</option><option value="FINAL">Final</option>
          </select>
        )}
      </Field>
      <Field label="Fecha y hora" name={`at-${applicationId}`} error={e.scheduledAt}>
        {(a) => <input {...a} name="scheduledAt" type="datetime-local" required />}
      </Field>
      <Field label="Lugar o enlace" name={`loc-${applicationId}`} error={e.location}>{(a) => <input {...a} name="location" />}</Field>
      <Button variant="secondary" disabled={pending}>Agendar</Button>
      <div className="sm:col-span-4"><FormError state={state} /></div>
    </form>
  );
}

export function InterviewResultForm({ action, id }: { action: Action; id: string }) {
  const { state, pending, form } = useForm(action);
  return (
    <form {...form} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <select name="result" aria-label="Resultado" defaultValue="FAVORABLE" className="rounded-[var(--radius-control)] border border-line px-2 py-1.5 text-sm">
        <option value="FAVORABLE">Favorable</option><option value="NOT_FAVORABLE">No favorable</option><option value="NO_SHOW">No se presentó</option>
      </select>
      <input name="resultNotes" placeholder="Comentario" aria-label="Comentario" className="rounded-[var(--radius-control)] border border-line px-2 py-1.5 text-sm" />
      <Button variant="ghost" disabled={pending}>Registrar</Button>
      <FormError state={state} />
    </form>
  );
}

export function NoteForm({ action, candidateId, applications }: { action: Action; candidateId: string; applications: Opt[] }) {
  const { state, pending, form } = useForm(action);
  const e = fieldErrors(state);
  return (
    <form {...form} className="space-y-2">
      <input type="hidden" name="candidateId" value={candidateId} />
      <Field label="Nueva nota" name="body" error={e.body}>{(a) => <textarea {...a} rows={3} required />}</Field>
      <div className="flex flex-wrap items-center gap-2">
        <select name="applicationId" aria-label="Sobre qué aplicación" className="rounded-[var(--radius-control)] border border-line px-3 py-2 text-sm">
          <option value="">General</option>
          {applications.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <Button variant="secondary" disabled={pending}>Guardar nota</Button>
        <FormError state={state} />
      </div>
    </form>
  );
}

export function ManualApplicationForm({ action, vacancies }: { action: Action; vacancies: Opt[] }) {
  const { state, pending, form } = useForm(action);
  const e = fieldErrors(state);
  return (
    <form {...form} className="grid gap-3 md:grid-cols-3">
      <Field label="Plaza" name="vacancyId" error={e.vacancyId}>
        {(a) => (
          <select {...a} required defaultValue="">
            <option value="" disabled>Elige…</option>
            {vacancies.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Nombre" name="firstName" error={e.firstName}>{(a) => <input {...a} required />}</Field>
      <Field label="Apellido" name="lastName" error={e.lastName}>{(a) => <input {...a} required />}</Field>
      <Field label="Teléfono" name="phone" error={e.phone}>{(a) => <input {...a} type="tel" required />}</Field>
      <Field label="Correo" name="email" error={e.email}>{(a) => <input {...a} type="email" />}</Field>
      <Field label="Origen" name="source" error={e.source}>
        {(a) => (
          <select {...a} defaultValue="feria">
            <option value="feria">Feria</option><option value="referido">Referido</option>
            <option value="aliado">Aliado</option><option value="otro">Otro</option>
          </select>
        )}
      </Field>
      <Field label="Detalle del origen" name="sourceDetail" error={e.sourceDetail}>{(a) => <input {...a} placeholder="Feria USAC, referido por…" />}</Field>
      <div className="flex items-center gap-4 md:col-span-3">
        <Button disabled={pending}>Registrar aplicación</Button>
        <FormError state={state} />
      </div>
    </form>
  );
}

export function QuestionForm({ action, vacancyId }: { action: Action; vacancyId: string }) {
  const { state, pending, form } = useForm(action);
  const e = fieldErrors(state);
  return (
    <form {...form} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <div className="md:col-span-2">
        <Field label="Pregunta" name="prompt" error={e.prompt}>{(a) => <input {...a} required placeholder="¿Tienes moto y licencia vigente?" />}</Field>
      </div>
      <Field label="Tipo" name="type" error={e.type}>
        {(a) => (
          <select {...a} defaultValue="YES_NO">
            <option value="YES_NO">Sí / No</option><option value="SINGLE_CHOICE">Opción única</option>
            <option value="NUMBER">Número</option><option value="TEXT">Texto libre</option>
          </select>
        )}
      </Field>
      <Field label="Respuesta esperada" name="expected" error={e.expected} hint='Sí/No: "sí" o "no" · Opción: aceptadas, una por línea · Número: "min-max" (p. ej. "1-")'>
        {(a) => <textarea {...a} rows={2} />}
      </Field>
      <Field label="Opciones (solo opción única)" name="options" error={e.options} hint="Una por línea">
        {(a) => <textarea {...a} rows={3} />}
      </Field>
      <div className="flex items-center gap-4 self-end">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="required" defaultChecked /> Obligatoria</label>
        <Button variant="secondary" disabled={pending}>Agregar pregunta</Button>
      </div>
      <div className="md:col-span-2"><FormError state={state} /></div>
    </form>
  );
}
