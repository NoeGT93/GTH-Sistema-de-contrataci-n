import { getActor } from "@/server/auth";
import { authorize } from "@/server/auth/permissions";
import { getFormCatalogs, getVacancy } from "@/server/modules/vacancies/queries";
import { toISODate } from "@/server/lib/businessDays";
import { VacancyForm } from "@/components/admin/forms";
import { saveVacancyAction } from "../../../actions";

export const metadata = { title: "Editar plaza" };

export default async function EditVacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  const v = await getVacancy(actor, (await params).id);
  authorize(actor, "vacancy.update", v);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Editar · {v.title}</h1>
      <VacancyForm
        action={saveVacancyAction}
        catalogs={await getFormCatalogs()}
        canAssignOwner={actor.role !== "TALENT_ADVISOR"}
        defaults={{
          ...v,
          branchIds: v.branches.map((b) => b.branchId),
          requestedAt: toISODate(v.requestedAt),
          closesAt: v.closesAt ? toISODate(v.closesAt) : undefined,
        }}
      />
    </div>
  );
}
