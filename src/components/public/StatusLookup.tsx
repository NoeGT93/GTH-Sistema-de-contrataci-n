"use client";

import { startTransition, useActionState } from "react";
import { checkStatusAction, type StatusState } from "@/app/(public)/actions";
import { publicTimeline } from "@/server/modules/applications/rules";
import { Button, Field } from "@/components/ui";

export function StatusLookup() {
  const [state, action, pending] = useActionState<StatusState, FormData>(checkStatusAction, null);
  const e = state && !state.ok ? (state.error.fields ?? {}) : {};
  return (
    <div className="space-y-8">
      {/* onSubmit en vez de action: React 19 vaciaría el código tras un intento fallido. */}
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.currentTarget);
          startTransition(() => action(fd));
        }}
        className="grid gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
        <Field label="Código de seguimiento" name="code" error={e.code}>
          {(a) => <input {...a} required maxLength={8} autoCapitalize="characters" className={`${(a as { className: string }).className} font-mono uppercase`} />}
        </Field>
        <Field label="Últimos 4 de tu teléfono" name="last4" error={e.last4}>
          {(a) => <input {...a} required inputMode="numeric" maxLength={4} />}
        </Field>
        <Button disabled={pending}>Consultar</Button>
      </form>
      <div aria-live="polite">
        {state && !state.ok && !state.error.fields && <p className="text-sm font-medium text-danger">{state.error.message}</p>}
        {state?.ok && (
          <section className="rounded-[var(--radius-card)] border border-line p-6">
            <p className="text-sm text-muted">Hola {state.data.firstName}, tu aplicación a</p>
            <h2 className="text-xl font-bold">{state.data.vacancy}</h2>
            <p className="mt-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-900">{state.data.current}</p>
            <ol className="mt-6 space-y-3 border-l-2 border-brand-400 pl-4 text-sm">
              {publicTimeline(state.data.events).map((ev, i) => (
                <li key={i}>
                  <strong>{ev.label}</strong>{" "}
                  <span className="text-muted">· {new Date(ev.at).toLocaleDateString("es-GT", { timeZone: "America/Guatemala", day: "numeric", month: "long" })}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
