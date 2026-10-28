"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { moveFromBoard } from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui";

type Stage = { key: string; name: string; category: string; requiresReason: boolean };
type Card = { id: string; candidateId: string; name: string; stageKey: string; days: number; needsReview: boolean; assignee?: string };

/** Arrastrar y soltar, y también un selector por tarjeta (accesible por teclado). */
export function KanbanBoard({ stages, cards }: { stages: Stage[]; cards: Card[] }) {
  const [items, setItems] = useState(cards);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [, start] = useTransition();
  const active = stages.filter((s) => s.category === "ACTIVE");
  const closed = stages.filter((s) => s.category !== "ACTIVE");

  function move(id: string, stageKey: string) {
    const card = items.find((c) => c.id === id);
    const stage = stages.find((s) => s.key === stageKey);
    if (!card || !stage || card.stageKey === stageKey) return;
    let reason: string | undefined;
    if (stage.requiresReason) {
      reason = window.prompt(`Motivo para mover a "${stage.name}"`)?.trim();
      if (!reason) return;
    }
    const before = items;
    setItems(items.map((c) => (c.id === id ? { ...c, stageKey, days: 0 } : c))); // optimista
    setError("");
    start(async () => {
      const r = await moveFromBoard({ id, stageKey, reason });
      if (!r.ok) {
        setItems(before);
        setError(r.error.message);
      }
    });
  }

  const column = (s: Stage) => {
    const list = items.filter((c) => c.stageKey === s.key);
    return (
      <section
        key={s.key}
        aria-label={`${s.name}: ${list.length}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => dragging && move(dragging, s.key)}
        className="flex w-64 shrink-0 flex-col rounded-[var(--radius-card-sm)] bg-white p-3 ring-1 ring-line"
      >
        <h2 className="mb-2 flex items-center justify-between text-sm font-semibold">
          {s.name} <span className="text-muted tabular-nums">{list.length}</span>
        </h2>
        <ul className="min-h-16 space-y-2">
          {list.map((c) => (
            <li
              key={c.id}
              draggable
              onDragStart={() => setDragging(c.id)}
              onDragEnd={() => setDragging(null)}
              className="cursor-grab rounded-lg border border-line bg-[#f7fafc] p-2 text-sm active:cursor-grabbing"
            >
              <Link href={`/admin/candidatos/${c.candidateId}`} className="font-medium hover:underline">{c.name}</Link>
              <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted">
                <span>{c.days} d en etapa</span>
                {c.assignee && <span>· {c.assignee}</span>}
                {c.needsReview && <Badge tone="warning">Revisar respuestas</Badge>}
              </div>
              <label className="sr-only" htmlFor={`mv-${c.id}`}>Mover a {c.name}</label>
              <select
                id={`mv-${c.id}`}
                value={c.stageKey}
                onChange={(e) => move(c.id, e.target.value)}
                className="mt-2 w-full rounded border border-line bg-white px-1 py-1 text-xs"
              >
                {stages.map((st) => <option key={st.key} value={st.key}>{st.name}</option>)}
              </select>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className="space-y-3">
      <p aria-live="assertive" className="text-sm font-medium text-danger">{error}</p>
      <div className="relative flex gap-3 overflow-x-auto pb-4">{active.map(column)}</div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Cerradas, contratadas y base de talento ({items.filter((c) => closed.some((s) => s.key === c.stageKey)).length})
        </summary>
        <div className="relative mt-3 flex gap-3 overflow-x-auto pb-4">{closed.map(column)}</div>
      </details>
    </div>
  );
}
