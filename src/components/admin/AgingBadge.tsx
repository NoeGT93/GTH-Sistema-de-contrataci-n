import { Badge, type BadgeTone } from "@/components/ui";
import type { Aging } from "@/server/modules/reports/aging";

const MAP: Record<Aging["status"], [BadgeTone, string]> = {
  ON_TIME: ["success", "En tiempo"],
  DUE_SOON: ["warning", "Por vencer"],
  OVERDUE: ["danger", "Vencido"],
};

/** Reemplaza el semáforo del Excel: "Vencido · 34 d". */
export function AgingBadge({ aging }: { aging: Aging }) {
  const [tone, label] = MAP[aging.status];
  return (
    <span title={`${aging.days} días hábiles abiertos; límite ${aging.limit}`}>
      <Badge tone={tone}>{label} · {aging.days} d</Badge>
    </span>
  );
}
