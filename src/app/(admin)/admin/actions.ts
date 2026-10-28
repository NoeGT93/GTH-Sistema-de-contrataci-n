"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth";
import { run, type Result } from "@/server/lib/result";
import { createRequisition, transitionVacancy, updateVacancy } from "@/server/modules/vacancies/service";
import { addPromotion, createPartner, removePromotion } from "@/server/modules/promotion/service";
import { addScreeningQuestion, removeScreeningQuestion } from "@/server/modules/vacancies/questions";
import { addNote } from "@/server/modules/candidates/service";
import {
  assignApplication, createApplicationManual, moveApplication, recordInterviewResult, scheduleInterview,
} from "@/server/modules/applications/service";

// Las server actions solo traducen FormData y llaman al caso de uso.
export type FormState = Result<unknown> | null;

const fields = (fd: FormData) => ({ ...Object.fromEntries(fd), branchIds: fd.getAll("branchIds") });

export async function saveVacancyAction(_: FormState, fd: FormData): Promise<FormState> {
  const actor = await getActor();
  const input = fields(fd);
  const r = await run(() => (fd.get("id") ? updateVacancy(actor, input) : createRequisition(actor, input)));
  if (!r.ok) return r;
  revalidatePath("/admin", "layout");
  redirect(`/admin/plazas/${r.data.id}`);
}

export async function transitionAction(_: FormState, fd: FormData): Promise<FormState> {
  const actor = await getActor();
  const r = await run(() => transitionVacancy(actor, Object.fromEntries(fd)));
  if (r.ok) {
    revalidatePath("/admin", "layout");
    revalidatePath("/empleos", "layout");
    revalidatePath("/");
  }
  return r;
}

export async function addPromotionAction(_: FormState, fd: FormData): Promise<FormState> {
  const actor = await getActor();
  const r = await run(() => addPromotion(actor, Object.fromEntries(fd)));
  if (r.ok) revalidatePath("/admin", "layout");
  return r;
}

export async function removePromotionAction(fd: FormData) {
  const actor = await getActor();
  await removePromotion(actor, String(fd.get("id")));
  revalidatePath("/admin", "layout");
}

export async function createPartnerAction(_: FormState, fd: FormData): Promise<FormState> {
  const actor = await getActor();
  const r = await run(() => createPartner(actor, Object.fromEntries(fd)));
  if (r.ok) revalidatePath("/admin/aliados");
  return r;
}

// ───────────── Candidatos y pipeline (1B) ─────────────

const refresh = () => revalidatePath("/admin", "layout");

/** Envuelve un caso de uso de formulario: actor, Result y revalidación. */
function formAction(fn: (actor: Awaited<ReturnType<typeof getActor>>, input: Record<string, unknown>) => Promise<unknown>) {
  return async (_: FormState, fd: FormData): Promise<FormState> => {
    const actor = await getActor();
    const r = await run(() => fn(actor, Object.fromEntries(fd)));
    if (r.ok) refresh();
    return r;
  };
}

export async function moveApplicationAction(s: FormState, fd: FormData) {
  return formAction(moveApplication)(s, fd);
}
export async function scheduleInterviewAction(s: FormState, fd: FormData) {
  return formAction(scheduleInterview)(s, fd);
}
export async function interviewResultAction(s: FormState, fd: FormData) {
  return formAction(recordInterviewResult)(s, fd);
}
export async function addNoteAction(s: FormState, fd: FormData) {
  return formAction(addNote)(s, fd);
}
export async function addQuestionAction(s: FormState, fd: FormData) {
  return formAction(addScreeningQuestion)(s, fd);
}
export async function assignAction(s: FormState, fd: FormData) {
  return formAction((a, i) => assignApplication(a, { id: String(i.id), assigneeId: String(i.assigneeId ?? "") }))(s, fd);
}

export async function manualApplicationAction(_: FormState, fd: FormData): Promise<FormState> {
  const actor = await getActor();
  const r = await run(() => createApplicationManual(actor, Object.fromEntries(fd)));
  if (!r.ok) return r;
  refresh();
  redirect(`/admin/candidatos/${r.data.candidateId}`);
}

export async function removeQuestionAction(fd: FormData) {
  const actor = await getActor();
  await run(() => removeScreeningQuestion(actor, String(fd.get("id"))));
  refresh();
}

/** Kanban (arrastrar y soltar): mismo caso de uso que el formulario. */
export async function moveFromBoard(input: { id: string; stageKey: string; reason?: string }) {
  const actor = await getActor();
  const r = await run(() => moveApplication(actor, input));
  if (r.ok) refresh();
  return r;
}
