"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitApplicationAction } from "@/app/(public)/actions";
import { Button, Field } from "@/components/ui";

type Question = { id: string; prompt: string; type: "YES_NO" | "SINGLE_CHOICE" | "TEXT" | "NUMBER"; options: string[]; required: boolean };
type Props = { slug: string; questions: Question[]; cvRequired: boolean; consentText: string };
type Errors = Record<string, string[]>;

const CV_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const CONTACT = ["firstName", "lastName", "phone", "email"];

/** Contacto · Precalificación · CV y consentimiento. El progreso vive en el estado del paso. */
export function ApplyWizard({ slug, questions, cvRequired, consentText }: Props) {
  const steps = ["Tus datos", ...(questions.length ? ["Preguntas"] : []), "CV y envío"];
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [motivation, setMotivation] = useState("");
  const [consent, setConsent] = useState(false);
  const [cv, setCv] = useState<{ state: "idle" | "uploading" | "done" | "error"; fileId?: string; name?: string; msg?: string }>({ state: "idle" });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const current = steps[step];

  // Al cambiar de paso, el foco va al título (lectores de pantalla y teclado).
  useEffect(() => heading.current?.focus(), [step]);

  function validateStep(): boolean {
    const e: Errors = {};
    if (current === "Tus datos") {
      if (contact.firstName.trim().length < 2) e.firstName = ["Escribe tu nombre"];
      if (contact.lastName.trim().length < 2) e.lastName = ["Escribe tu apellido"];
      if (contact.phone.replace(/\D/g, "").length < 8) e.phone = ["Escribe un teléfono de 8 dígitos"];
      if (contact.email && !/^\S+@\S+\.\S+$/.test(contact.email)) e.email = ["Correo inválido"];
    }
    if (current === "Preguntas")
      for (const q of questions) if (q.required && !answers[q.id]) e[`q_${q.id}`] = ["Responde esta pregunta"];
    if (current === "CV y envío") {
      if (cvRequired && cv.state !== "done") e.cv = ["Sube tu CV"];
      if (cv.state === "uploading") e.cv = ["Espera a que termine de subir"];
      if (!consent) e.consent = ["Necesitamos tu autorización"];
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function upload(file: File) {
    setCv({ state: "uploading", name: file.name });
    try {
      const res = await fetch("/api/public/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, fileName: file.name, contentType: file.type, size: file.size }),
      });
      const r = await res.json();
      if (!r.ok) return setCv({ state: "error", msg: r.error.message });
      const put = await fetch(r.data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error();
      setCv({ state: "done", fileId: r.data.fileId, name: file.name });
    } catch {
      setCv({ state: "error", msg: "No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo." });
    }
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep()) return;
    if (step < steps.length - 1) return setStep(step + 1);
    start(async () => {
      setMessage("");
      const r = await submitApplicationAction({
        slug, ...contact, answers, motivation, cvFileId: cv.fileId, consent,
      });
      if (r.ok && !r.data.duplicate) return router.push(`/empleos/${slug}/aplicar/listo?codigo=${r.data.trackingCode}`);
      if (r.ok) return setMessage("Ya habías aplicado a esta vacante con este teléfono. Actualizamos tus datos de contacto.");
      setErrors(r.error.fields ?? {});
      setMessage(r.error.message);
      if (Object.keys(r.error.fields ?? {}).some((k) => CONTACT.includes(k))) setStep(0);
    });
  }

  const set = (k: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement>) => setContact({ ...contact, [k]: e.target.value });

  return (
    <form onSubmit={next} noValidate className="space-y-6">
      <ol className="flex gap-2 text-xs font-semibold" aria-label="Pasos">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}
            className={`flex-1 rounded-full px-3 py-1.5 text-center ${i <= step ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-900"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold outline-none">{current}</h2>

      {current === "Tus datos" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" name="firstName" error={errors.firstName}>{(a) => <input {...a} value={contact.firstName} onChange={set("firstName")} autoComplete="given-name" />}</Field>
          <Field label="Apellido" name="lastName" error={errors.lastName}>{(a) => <input {...a} value={contact.lastName} onChange={set("lastName")} autoComplete="family-name" />}</Field>
          <Field label="Teléfono / WhatsApp" name="phone" error={errors.phone} hint="8 dígitos, p. ej. 5555 1234">
            {(a) => <input {...a} type="tel" inputMode="tel" value={contact.phone} onChange={set("phone")} autoComplete="tel" />}
          </Field>
          <Field label="Correo (opcional)" name="email" error={errors.email} hint="Te enviamos la confirmación y los avisos">
            {(a) => <input {...a} type="email" value={contact.email} onChange={set("email")} autoComplete="email" />}
          </Field>
        </div>
      )}

      {current === "Preguntas" &&
        questions.map((q) => {
          const name = `q_${q.id}`;
          const value = answers[q.id] ?? "";
          const setA = (v: string) => setAnswers({ ...answers, [q.id]: v });
          const choices = q.type === "YES_NO" ? [["yes", "Sí"], ["no", "No"]] : q.options.map((o) => [o, o]);
          return q.type === "YES_NO" || q.type === "SINGLE_CHOICE" ? (
            <fieldset key={q.id} className="space-y-2" aria-describedby={errors[name] ? `${name}-error` : undefined}>
              <legend className="text-sm font-medium">{q.prompt}{q.required && " *"}</legend>
              <div className="flex flex-wrap gap-2">
                {choices.map(([v, l]) => (
                  <label key={v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-4 text-sm ${value === v ? "border-brand-600 bg-brand-50" : "border-line"}`}>
                    <input type="radio" name={name} value={v} checked={value === v} onChange={() => setA(v)} />
                    {l}
                  </label>
                ))}
              </div>
              {errors[name] && <p id={`${name}-error`} className="text-xs text-danger">{errors[name].join(" ")}</p>}
            </fieldset>
          ) : (
            <Field key={q.id} label={`${q.prompt}${q.required ? " *" : ""}`} name={name} error={errors[name]}>
              {(a) =>
                q.type === "NUMBER"
                  ? <input {...a} type="number" inputMode="numeric" value={value} onChange={(e) => setA(e.target.value)} />
                  : <textarea {...a} rows={3} value={value} onChange={(e) => setA(e.target.value)} />
              }
            </Field>
          );
        })}

      {current === "CV y envío" && (
        <div className="space-y-4">
          <Field label={`CV (PDF, DOC o DOCX, máx. 5 MB)${cvRequired ? "" : " — opcional"}`} name="cv" error={errors.cv}>
            {(a) => <input {...a} type="file" accept={CV_ACCEPT} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />}
          </Field>
          <p aria-live="polite" className="text-sm">
            {cv.state === "uploading" && "Subiendo…"}
            {cv.state === "done" && `✓ ${cv.name} listo`}
            {cv.state === "error" && <span className="text-danger">{cv.msg}</span>}
          </p>
          <Field label="¿Por qué te interesa esta plaza? (opcional)" name="motivation" error={errors.motivation}>
            {(a) => <textarea {...a} rows={3} maxLength={2000} value={motivation} onChange={(e) => setMotivation(e.target.value)} />}
          </Field>
          <div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5"
                aria-describedby={errors.consent ? "consent-error" : undefined} />
              <span>{consentText}</span>
            </label>
            {errors.consent && <p id="consent-error" className="mt-1 text-xs text-danger">{errors.consent.join(" ")}</p>}
          </div>
        </div>
      )}

      <p aria-live="assertive" className="text-sm font-medium text-danger">{message}</p>

      <div className="flex gap-3">
        {step > 0 && <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>Atrás</Button>}
        <Button disabled={pending || cv.state === "uploading"} className="flex-1 sm:flex-none">
          {step < steps.length - 1 ? "Continuar" : pending ? "Enviando…" : "Enviar aplicación"}
        </Button>
      </div>
    </form>
  );
}
