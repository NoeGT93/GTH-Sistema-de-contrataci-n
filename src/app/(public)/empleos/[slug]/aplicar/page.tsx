import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { ApplyWizard } from "@/components/public/ApplyWizard";

export const metadata = { title: "Aplicar", robots: { index: false } };

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [v, consent] = await Promise.all([
    db.vacancy.findFirst({
      where: { slug, status: "ACTIVE", visibility: "PUBLIC" },
      select: { title: true, cvRequired: true, questions: { orderBy: { sortOrder: "asc" }, select: { id: true, prompt: true, type: true, options: true, required: true } } },
    }),
    db.consentVersion.findFirst({ where: { purpose: "application" }, orderBy: { version: "desc" } }),
  ]);
  if (!v || !consent) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/empleos/${slug}`} className="text-sm text-brand-600 hover:underline">← {v.title}</Link>
      <h1 className="mt-2 text-2xl font-bold md:text-3xl">Aplica a {v.title}</h1>
      <p className="mt-1 text-sm text-muted">Toma unos 3 minutos.</p>
      <div className="mt-8">
        <ApplyWizard
          slug={slug}
          cvRequired={v.cvRequired}
          consentText={consent.text}
          questions={v.questions.map((q) => ({ ...q, options: Array.isArray(q.options) ? (q.options as string[]) : [] }))}
        />
      </div>
    </div>
  );
}
