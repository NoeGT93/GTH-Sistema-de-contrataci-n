import { getActor } from "@/server/auth";
import { authorize } from "@/server/auth/permissions";
import { getPipeline, pipelineVacancies } from "@/server/modules/candidates/queries";
import { businessDays, todayGT } from "@/server/lib/businessDays";
import { loadAgingContext } from "@/server/modules/reports/aging";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { buttonClass, EmptyState } from "@/components/ui";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ vacante?: string }> }) {
  const actor = await getActor();
  authorize(actor, "candidate.read");
  const vacancies = await pipelineVacancies(actor);
  const vacancyId = (await searchParams).vacante ?? vacancies[0]?.id;
  const data = vacancyId ? await getPipeline(actor, vacancyId) : null;
  const { holidays } = await loadAgingContext();
  const today = todayGT();
  const cards = (data?.apps ?? []).map((a) => ({
    id: a.id,
    candidateId: a.candidate.id,
    name: `${a.candidate.firstName} ${a.candidate.lastName}`,
    stageKey: data!.stages.find((s) => s.id === a.stageId)?.key ?? "",
    days: Math.max(0, businessDays(a.stageEvents[0]?.createdAt ?? a.createdAt, today, holidays) - 1),
    needsReview: a.needsReview,
    assignee: a.assignee?.name,
  }));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <form className="flex gap-2">
          <select name="vacante" defaultValue={vacancyId} aria-label="Plaza"
            className="rounded-[var(--radius-control)] border border-line bg-white px-3 py-2 text-sm">
            {vacancies.map((v) => <option key={v.id} value={v.id}>{v.title} ({v._count.applications})</option>)}
          </select>
          <button className={buttonClass("secondary")}>Ver</button>
        </form>
      </div>
      {data ? (
        // key: al cambiar datos del servidor se reinicia el estado optimista del tablero.
        <KanbanBoard key={JSON.stringify(cards.map((c) => [c.id, c.stageKey]))} stages={data.stages} cards={cards} />
      ) : (
        <EmptyState title="Aún no hay aplicaciones">Cuando lleguen aplicaciones aparecerán aquí por etapa.</EmptyState>
      )}
    </div>
  );
}
