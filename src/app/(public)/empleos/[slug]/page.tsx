import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicVacancy, similarPublicVacancies } from "@/server/modules/vacancies/queries";
import Link from "next/link";
import { closingText, daysLeft, JobCard, MODALITY_LABEL } from "@/components/public/JobCard";
import { ShareButton } from "@/components/public/ShareButton";
import { todayGT } from "@/server/lib/businessDays";
import { buttonClass } from "@/components/ui";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = await getPublicVacancy((await params).slug);
  return v ? { title: v.title, description: v.summary ?? undefined } : {};
}

const lines = (s: string | null) => (s ?? "").split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);

export default async function JobPage({ params }: Props) {
  const v = await getPublicVacancy((await params).slug);
  if (!v) notFound();
  const sedes = v.branches.map((b) => b.branch.name).join(", ");
  const today = todayGT();
  const similar = v.status === "ACTIVE" ? [] : await similarPublicVacancies(v.area?.slug, v.slug!);

  // JSON-LD JobPosting solo para plazas activas.
  const jsonLd = v.status === "ACTIVE" && {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: v.title,
    description: [v.description, v.requirements].filter(Boolean).join("\n\n") || v.title,
    datePosted: v.publishedAt?.toISOString().slice(0, 10),
    validThrough: v.closesAt?.toISOString().slice(0, 10),
    hiringOrganization: { "@type": "Organization", name: "FUNDAP" },
    jobLocation: v.branches.map((b) => ({
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: b.branch.name, addressCountry: "GT" },
    })),
    ...(v.modality === "REMOTE" ? { jobLocationType: "TELECOMMUTE" } : {}),
  };

  const closing = v.status === "ACTIVE" ? closingText(daysLeft(v.closesAt, today)) : null;
  const applyHref = `/empleos/${v.slug}/aplicar`;

  return (
    <div className="bg-surface pb-24 md:pb-0">
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      <article className="mx-auto max-w-[1180px] px-4 py-10 md:px-6 md:py-14">
        <Link href="/empleos" className="text-sm font-semibold text-brand-600 hover:underline">← Todas las vacantes</Link>
        {v.status !== "ACTIVE" && (
          <p role="status" className="mt-6 rounded-[var(--radius-card-sm)] border border-[#f2dfc3] bg-[#fff7ec] p-4 text-sm font-semibold text-warning">
            {v.status === "PAUSED" ? "Esta vacante está temporalmente pausada." : "Esta vacante ya cerró. Mira otras plazas similares abajo."}
          </p>
        )}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[var(--radius-card)] border border-line bg-white p-6 md:p-8">
            {v.area && <p className="eyebrow">{v.area.name}</p>}
            <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.4rem)] leading-tight font-bold tracking-[-0.03em]">{v.title}</h1>
            {v.summary && <p className="mt-4 text-muted">{v.summary}</p>}
            {v.description && (
              <section className="mt-6">
                <h2 className="mb-2 font-bold">Principales responsabilidades</h2>
                <p className="whitespace-pre-line text-sm text-muted">{v.description}</p>
              </section>
            )}
            {[["Perfil que buscamos", v.requirements], ["Beneficios", v.benefits]].map(([title, body]) =>
              lines(body).length ? (
                <section key={title} className="mt-6">
                  <h2 className="mb-2 font-bold">{title}</h2>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{lines(body).map((l) => <li key={l}>{l}</li>)}</ul>
                </section>
              ) : null,
            )}
          </div>

          <aside className="h-max rounded-[var(--radius-card-sm)] border border-line bg-white p-5 lg:sticky lg:top-24">
            {v.area && <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800">{v.area.name}</span>}
            <dl className="mt-2 text-sm">
              {[
                ["Ubicación", sedes],
                ["Modalidad", MODALITY_LABEL[v.modality]],
                ...(v.salaryText ? [["Salario", v.salaryText]] : []),
                ...(v.closesAt && v.status === "ACTIVE"
                  ? [["Cierre", `${v.closesAt.toLocaleDateString("es-GT", { timeZone: "UTC", day: "numeric", month: "long" })}${closing ? ` · ${closing.toLowerCase()}` : ""}`]]
                  : []),
              ].map(([k, val]) => (
                <div key={k} className="mt-3.5">
                  <dt className="text-xs font-bold tracking-wider text-muted uppercase">{k}</dt>
                  <dd className="mt-0.5 font-semibold">{val}</dd>
                </div>
              ))}
            </dl>
            {v.status === "ACTIVE" && <Link href={applyHref} className={`${buttonClass()} mt-5 w-full max-md:hidden`}>Aplicar a esta vacante</Link>}
            <ShareButton title={v.title} className="mt-3 w-full" />
            <p className="mt-5 rounded-xl bg-brand-50 p-3 text-xs text-brand-900">
              <strong>Aviso:</strong> FUNDAP nunca cobra por aplicar ni pide depósitos durante el proceso.
            </p>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-bold">Vacantes similares</h2>
            <div className="grid gap-3.5">{similar.map((s) => <JobCard key={s.slug} v={s} today={today} />)}</div>
          </section>
        )}
      </article>

      {/* Botón Aplicar fijo en móvil. */}
      {v.status === "ACTIVE" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white p-3 md:hidden">
          <Link href={applyHref} className={`${buttonClass()} w-full`}>Aplicar ahora</Link>
        </div>
      )}
    </div>
  );
}
