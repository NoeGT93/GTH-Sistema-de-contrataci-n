import { getActor } from "@/server/auth";
import { authorize } from "@/server/auth/permissions";
import { getFormCatalogs } from "@/server/modules/vacancies/queries";
import { addCalendarDays, todayGT } from "@/server/lib/businessDays";
import { VacancyForm } from "@/components/admin/forms";
import { saveVacancyAction } from "../../actions";

export const metadata = { title: "Nuevo requerimiento" };

export default async function NewVacancyPage() {
  const actor = await getActor();
  authorize(actor, "vacancy.create");
  const today = todayGT();
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Nuevo requerimiento</h1>
      <VacancyForm
        action={saveVacancyAction}
        catalogs={await getFormCatalogs()}
        canAssignOwner={actor.role !== "TALENT_ADVISOR"}
        // Si no se define cierre, el sistema propone apertura + 30 días.
        defaults={{ requestedAt: today, closesAt: addCalendarDays(today, 30) }}
      />
    </div>
  );
}
