import { db } from "@/server/db";
import { appResource, authorize, type Actor } from "@/server/auth/permissions";
import { audit } from "@/server/modules/audit/service";
import { AppError } from "@/server/lib/result";
import { noteSchema } from "@/server/modules/applications/schemas";
import { appScope } from "./queries";

export async function addNote(actor: Actor, input: unknown) {
  const f = noteSchema.parse(input);
  authorize(actor, "candidate.write");
  if (f.applicationId) {
    const app = await db.application.findUnique({ where: { id: f.applicationId }, include: { vacancy: { select: { ownerId: true } } } });
    if (!app || app.candidateId !== f.candidateId) throw new AppError("NOT_FOUND", "La aplicación no existe.");
    authorize(actor, "candidate.write", appResource(app));
  } else if (!(await db.candidate.findFirst({ where: { id: f.candidateId, applications: { some: appScope(actor) } } }))) {
    throw new AppError("NOT_FOUND", "El candidato no existe.");
  }
  await db.$transaction(async (tx) => {
    const n = await tx.note.create({ data: { ...f, authorId: actor.id } });
    await audit(tx, actor, "note.add", "candidate", f.candidateId, { noteId: n.id });
  });
}
