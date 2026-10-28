import Link from "next/link";
import { db } from "@/server/db";
import { listPublicVacancies } from "@/server/modules/vacancies/queries";
import { JobCard } from "@/components/public/JobCard";
import { buttonClass } from "@/components/ui";

// ISR: se revalida al publicar/cerrar (revalidatePath) y cada hora como respaldo.
export const revalidate = 3600;

// Etapas públicas del pipeline (las mismas etiquetas que verá el candidato en "Mi candidatura").
const STEPS = [
  ["Aplicación recibida", "Llenas un formulario corto desde tu celular."],
  ["En revisión", "RR. HH. revisa tu perfil y te contacta."],
  ["Entrevistas", "Conversas con RR. HH. y con el equipo de la plaza."],
  ["Etapa final", "Verificamos referencias y te hacemos la oferta."],
];

export default async function HomePage() {
  const [jobs, areas] = await Promise.all([
    listPublicVacancies(),
    db.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <section className="bg-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-[58px] md:py-[84px]">
          <h1 className="max-w-3xl text-[clamp(2rem,5vw,3.5rem)] leading-tight font-bold">
            Trabaja donde tu trabajo cambia vidas
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Encuentra tu plaza en FUNDAP y aplica en minutos desde tu celular.
          </p>
          {/* Búsqueda: envía a /empleos con filtros en la URL. */}
          <form action="/empleos" className="mt-8 grid max-w-3xl gap-3 rounded-[var(--radius-card-sm)] bg-white p-4 text-ink shadow-md md:grid-cols-[1fr_200px_auto]">
            <label className="sr-only" htmlFor="q">Puesto</label>
            <input id="q" name="q" placeholder="¿Qué puesto buscas?" className="rounded-[var(--radius-control)] border border-line px-3 py-2" />
            <label className="sr-only" htmlFor="area">Área</label>
            <select id="area" name="area" className="rounded-[var(--radius-control)] border border-line px-3 py-2">
              <option value="">Todas las áreas</option>
              {areas.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}
            </select>
            <button className={buttonClass()}>Buscar</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-[58px] md:py-[84px]">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold md:text-3xl">Vacantes abiertas</h2>
          <Link href="/empleos" className="text-sm font-semibold text-brand-600 hover:underline">Ver todas</Link>
        </div>
        {jobs.length === 0 ? (
          <p className="mt-6 text-muted">En este momento no hay vacantes publicadas. Vuelve pronto.</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.slice(0, 6).map((v) => <JobCard key={v.slug} v={v} />)}
          </div>
        )}
      </section>

      <section className="bg-brand-50">
        <div className="mx-auto max-w-6xl px-4 py-[58px] md:py-[84px]">
          <h2 className="text-2xl font-bold md:text-3xl">Así es el proceso</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-[var(--radius-card-sm)] bg-white p-6">
                <span className="text-sm font-bold text-brand-600">Paso {i + 1}</span>
                <p className="mt-1 font-semibold">{title}</p>
                <p className="mt-2 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
