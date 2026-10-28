import type { ComponentProps, ReactNode } from "react";

// Componentes base del design system. Radix entra cuando haya diálogos y menús (1B).

const BUTTON = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "border border-line bg-white text-ink hover:bg-brand-50",
  ghost: "text-brand-600 hover:bg-brand-50",
  danger: "bg-danger text-white hover:opacity-90",
} as const;

export const buttonClass = (variant: keyof typeof BUTTON = "primary") =>
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-sm font-semibold transition disabled:opacity-50 md:min-h-10 ${BUTTON[variant]}`;

export function Button({ variant, className = "", ...p }: ComponentProps<"button"> & { variant?: keyof typeof BUTTON }) {
  return <button className={`${buttonClass(variant)} ${className}`} {...p} />;
}

const BADGE = {
  neutral: "bg-brand-50 text-brand-900",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
} as const;
export type BadgeTone = keyof typeof BADGE;

/** El estado nunca se comunica solo con color: el badge siempre lleva texto. */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${BADGE[tone]}`}>
      {children}
    </span>
  );
}

const control =
  "w-full rounded-[var(--radius-control)] border border-line bg-white px-3 py-2 text-sm text-ink aria-[invalid=true]:border-danger";

/** Etiqueta, ayuda y error integrados; el error se vincula con aria-describedby. */
export function Field({
  label, name, error, hint, children,
}: { label: string; name: string; error?: string[]; hint?: string; children: (a11y: object) => ReactNode }) {
  const errId = `${name}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">{label}</label>
      {children({
        id: name,
        name,
        className: control,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errId : undefined,
      })}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p id={errId} className="text-xs text-danger">{error.join(" ")}</p>}
    </div>
  );
}

export function Card({ className = "", ...p }: ComponentProps<"div">) {
  return <div className={`rounded-[var(--radius-card-sm)] border border-line bg-white p-5 ${className}`} {...p} />;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card-sm)] border border-dashed border-line p-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}
