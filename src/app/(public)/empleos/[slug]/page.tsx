import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicVacancy, similarPublicVacancies } from "@/server/modules/vacancies/queries";
import Link from "next/link";
import { JobCard, MODALITY_LABEL } from "@/components/public/JobCard";
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

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      {v.status !== "ACTIVE" && (
        <p role="status" className="mb-6 rounded-[var(--radius-card-sm)] bg-warning/10 p-4 text-sm font-medium text-warning">
          {v.status === "PAUSED" ? "Esta vacante está temporalmente pausada." : "Esta vacante ya cerró. Mira otras plazas similares abajo."}
        </p>
      )}
      {v.area && <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">{v.area.name}</p>}
      <h1 className="mt-1 text-3xl font-bold">{v.title}</h1>
      <p className="mt-2 text-muted">{sedes} · {MODALITY_LABEL[v.modality]}</p>
      {v.salaryText && <p className="mt-1 font-semibold">{v.salaryText}</p>}
      {v.status === "ACTIVE" && (
        <Link href={`/empleos/${v.slug}/aplicar`} className={`${buttonClass()} mt-6 hidden md:inline-flex`}>Aplicar ahora</Link>
      )}
      {v.summary && <p className="mt-6 text-lg">{v.summary}</p>}
      {v.description && <p className="mt-4 whitespace-pre-line">{v.description}</p>}
      {[["Requisitos", v.requirements], ["Beneficios", v.benefits]].map(([title, body]) =>
        lines(body).length ? (
          <section key={title} className="mt-8">
            <h2 className="text-xl font-bold">{title}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5">{lines(body).map((l) => <li key={l}>{l}</li>)}</ul>
          </section>
        ) : null,
      )}
      {v.closesAt && v.status === "ACTIVE" && (
        <p className="mt-8 text-sm text-muted">
          Recibimos aplicaciones hasta el {v.closesAt.toLocaleDateString("es-GT", { timeZone: "UTC", day: "numeric", month: "long" })}.
        </p>
      )}
      <p className="mt-8 rounded-[var(--radius-card-sm)] bg-brand-50 p-4 text-sm">
        <strong>Aviso:</strong> FUNDAP nunca cobra por aplicar ni pide depósitos durante el proceso.
      </p>

      {/* Botón Aplicar fijo en móvil. */}
      {v.status === "ACTIVE" && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white p-3 md:hidden">
          <Link href={`/empleos/${v.slug}/aplicar`} className={`${buttonClass()} w-full`}>Aplicar ahora</Link>
        </div>
      )}

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Vacantes similares</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">{similar.map((s) => <JobCard key={s.slug} v={s} />)}</div>
        </section>
      )}
    </article>
  );
}
