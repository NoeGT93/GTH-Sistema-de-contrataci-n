"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth";
import { run, type Result } from "@/server/lib/result";
import { createRequisition, transitionVacancy, updateVacancy } from "@/server/modules/vacancies/service";
import { addPromotion, createPartner, removePromotion } from "@/server/modules/promotion/service";

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
