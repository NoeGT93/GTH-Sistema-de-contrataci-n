"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui";

type Job = { slug: string; title: string; area: string | null; branches: string[] };
type Props = { areas: { slug: string; name: string }[]; branches: string[]; jobs: Job[] };

/**
 * Match de Impacto: recomienda vacantes reales según el impacto que motiva y dónde trabajar.
 * Sin porcentajes de afinidad: solo filtra lo que hay publicado.
 */
export function MatchWizard({ areas, branches, jobs }: Props) {
  const [step, setStep] = useState(0);
  const [impact, setImpact] = useState("");
  const [place, setPlace] = useState("");
  const steps = [
    {
      title: "¿Qué tipo de impacto te motiva más?",
      text: "No pienses todavía en un cargo; piensa en dónde te gustaría aportar.",
      options: areas.map((a) => [a.name, a.name]),
      value: impact,
      set: setImpact,
    },
    {
      title: "¿Dónde te gustaría trabajar?",
      text: "Selecciona la sede que mejor se adapte a ti.",
      options: [...branches.map((b) => [b, b]), ["", "Estoy abierto/a a varias ubicaciones"]],
      value: place,
      set: setPlace,
    },
  ];

  const byArea = jobs.filter((j) => j.area === impact);
  const exact = byArea.filter((j) => !place || j.branches.includes(place));
  const results = exact.length ? exact : byArea;
  const areaSlug = areas.find((a) => a.name === impact)?.slug;

  return (
    <div className="rounded-[var(--radius-feature)] border border-line bg-white p-6 shadow-[var(--shadow-soft)] md:p-8">
      <div className="mb-6 flex gap-2" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-400" : "bg-[#e7eef3]"}`} />)}
      </div>
      {step < 2 ? (
        <fieldset>
          <legend className="text-xl font-bold">{steps[step].title}</legend>
          <p className="mt-1 text-sm text-muted">{steps[step].text}</p>
          <div className="my-5 grid gap-2.5 sm:grid-cols-2">
            {steps[step].options.map(([value, label]) => (
              <label key={label} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 has-focus-visible:ring-3 has-focus-visible:ring-brand-400 text-sm font-semibold ${steps[step].value === value && (value || step === 1) ? "border-brand-400 bg-brand-50 text-brand-900" : "border-line text-[#385064] hover:border-brand-400"}`}>
                <input type="radio" name={`match-${step}`} className="sr-only" checked={steps[step].value === value} onChange={() => steps[step].set(value)} />
                {label}
              </label>
            ))}
          </div>
          <div className="flex justify-between gap-3">
            <Button variant="secondary" type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>Atrás</Button>
            <Button type="button" disabled={step === 0 && !impact} onClick={() => setStep(step + 1)}>{step === 1 ? "Ver mi Match" : "Continuar"}</Button>
          </div>
        </fieldset>
      ) : (
        <div aria-live="polite">
          <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800">Resultado de tu Match</span>
          <h3 className="mt-3 text-2xl font-bold">
            {results.length ? `Tu interés se conecta con ${impact}.` : `Hoy no hay vacantes abiertas de ${impact}.`}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {results.length
              ? exact.length || !place ? "Estas oportunidades podrían ser un buen punto de partida." : `No hay plazas en ${place}; estas son de otras sedes.`
              : "Vuelve pronto o explora otras áreas."}
          </p>
          <ul className="mt-4 space-y-3">
            {results.slice(0, 3).map((j) => (
              <li key={j.slug} className="rounded-[var(--radius-card-sm)] border border-line bg-[#fbfdfe] p-4">
                <p className="font-bold">{j.title}</p>
                <p className="text-sm text-muted">{j.branches.join(", ")}</p>
                <Link href={`/empleos/${j.slug}`} className={`${buttonClass()} mt-3`}>Ver recomendación</Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" type="button" onClick={() => { setStep(0); setImpact(""); setPlace(""); }}>Volver a empezar</Button>
            {areaSlug && <Link href={`/empleos?area=${areaSlug}`} className={buttonClass("secondary")}>Ver vacantes de {impact}</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
