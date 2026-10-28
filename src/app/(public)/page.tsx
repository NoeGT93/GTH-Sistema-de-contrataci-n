import Image from "next/image";
import Link from "next/link";
import { db } from "@/server/db";
import { listPublicVacancies } from "@/server/modules/vacancies/queries";
import { todayGT } from "@/server/lib/businessDays";
import { JobCard } from "@/components/public/JobCard";
import { MatchWizard } from "@/components/public/MatchWizard";
import { buttonClass } from "@/components/ui";
import hero from "../../../public/images/hero.webp";

// Se renderiza por petición: así el build no necesita base de datos (Vercel compila sin DATABASE_URL).
export const dynamic = "force-dynamic";

// Contenido del prototipo v3. Pasa al CMS (content_blocks) en la Fase 1C.
const VALUES = [
  ["Trabajo con impacto", "Conecta cada vacante con la misión institucional y con las comunidades en las que FUNDAP desarrolla su labor."],
  ["Experiencia transparente", "Información clara de ubicación, funciones, requisitos, fecha de cierre y estado de la postulación."],
  ["Crecimiento profesional", "Oportunidades para aprender, asumir nuevos retos y fortalecer capacidades mientras contribuyes al propósito institucional."],
];

const STEPS = [
  ["Descubre", "Busca o encuentra tu Match de Impacto."],
  ["Aplica", "Completa un formulario breve y adjunta tu CV."],
  ["Revisión", "GTH valida requisitos y experiencia."],
  ["Entrevista", "Si avanzas, recibirás contacto para la siguiente etapa."],
  ["Resultado", "Consulta el avance desde “Mi candidatura”."],
];

const FAQ = [
  ["¿Tiene algún costo participar en un proceso?", "No. El proceso de selección de FUNDAP no tiene ningún costo. Desconfía de cualquier solicitud de pago."],
  ["¿Cómo sé en qué estado está mi solicitud?", "Al aplicar recibes un código de seguimiento. En “Mi candidatura” lo ingresas junto con los últimos 4 dígitos de tu teléfono y ves en qué etapa vas."],
  ["¿Puedo aplicar a varias vacantes?", "Sí. Puedes aplicar a todas las que te interesen, pero solo una vez a cada vacante."],
  ["¿Necesito correo electrónico?", "No es obligatorio. Con tu teléfono basta; si dejas tu correo te enviamos la confirmación y los avisos de tu proceso."],
];

const container = "mx-auto w-full max-w-[1180px] px-4 md:px-6";
const sectionHead = "mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-5";
const h2 = "mt-2 text-[clamp(1.9rem,3.2vw,2.85rem)] leading-[1.08] font-bold tracking-[-0.035em]";

export default async function HomePage() {
  const [jobs, areas, branches] = await Promise.all([
    listPublicVacancies(),
    db.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.branch.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const today = todayGT();

  return (
    <>
      {/* Hero */}
      <section id="inicio" className="relative isolate min-h-[520px] text-white md:min-h-[560px]">
        <Image src={hero} alt="" priority fill sizes="100vw" placeholder="blur"
          className="-z-10 object-cover object-[70%_center] md:object-[center_48%]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(10,34,54,.90)_0%,rgba(10,34,54,.76)_38%,rgba(10,34,54,.26)_66%,rgba(10,34,54,.06)_100%)] max-md:bg-[linear-gradient(0deg,rgba(10,34,54,.92)_0%,rgba(10,34,54,.70)_55%,rgba(10,34,54,.25)_100%)]" />
        <div className={`${container} flex min-h-[520px] items-end pt-12 pb-28 md:min-h-[560px] md:items-center md:pt-16`}>
          <div className="max-w-[720px]">
            <span className="inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-2 text-xs font-bold backdrop-blur">Haz carrera con propósito</span>
            <h1 className="my-4 text-[clamp(2.35rem,5vw,4.35rem)] leading-[1.03] font-bold tracking-[-0.045em]">
              Encuentra un lugar donde <span className="text-[#8fd7f2]">tu trabajo tenga sentido.</span>
            </h1>
            <p className="mb-7 max-w-[660px] text-[0.95rem] leading-relaxed text-white/85 md:text-[1.03rem]">
              Conoce cómo es trabajar en FUNDAP, entiende nuestro proceso y descubre oportunidades que conecten tu experiencia con el desarrollo de Guatemala.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="#vida" className={buttonClass()}>Conoce Vida FUNDAP</Link>
              <Link href="#proceso" className={`${buttonClass("secondary")} border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20`}>Cómo seleccionamos</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Búsqueda flotante: envía a /empleos con filtros en la URL. */}
      <div className={`${container} relative z-10 -mt-12 md:-mt-16`}>
        <div className="grid gap-4 rounded-[var(--radius-card-sm)] border border-line bg-white p-3.5 shadow-[var(--shadow-lift)] md:rounded-[var(--radius-card)] md:p-4.5 lg:grid-cols-[1fr_auto] lg:items-center">
          <form action="/empleos" role="search" aria-label="Buscar vacantes" className="grid min-w-0 gap-2 md:grid-cols-[1fr_220px_auto]">
            <input name="q" type="search" placeholder="Cargo, palabra clave o área" aria-label="Buscar empleo"
              className="min-w-0 rounded-[var(--radius-control)] border border-line px-4 py-3.5" />
            <select name="sede" aria-label="Ubicación" className="min-w-0 rounded-[var(--radius-control)] border border-line bg-white px-4 py-3.5">
              <option value="">Toda Guatemala</option>
              {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
            <button className={`${buttonClass()} px-6`}>Buscar</button>
          </form>
          <div className="flex items-center gap-3 border-line max-lg:border-t max-lg:pt-3 lg:min-w-[250px] lg:border-l lg:pl-4.5">
            <span aria-hidden className="grid size-10.5 shrink-0 place-items-center rounded-2xl bg-brand-50 font-extrabold text-brand-600">↗</span>
            <div>
              <small className="block text-xs text-muted">¿No sabes qué buscar?</small>
              <Link href="#match" className="text-sm font-bold text-brand-900 hover:text-brand-600">Descubre tu Match de Impacto</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Vida FUNDAP */}
      <section id="vida" className="scroll-mt-20 bg-gradient-to-b from-white to-[#f7fbfe] py-[58px] md:py-[84px]">
        <div className={container}>
          <div className={sectionHead}>
            <div><p className="eyebrow">Vida FUNDAP</p><h2 className={h2}>Conoce primero dónde vas a crecer.</h2></div>
            <p className="max-w-[520px] text-muted">Antes de revisar una vacante, conoce qué significa formar parte de FUNDAP: impacto, aprendizaje, cercanía con las comunidades y una experiencia de selección transparente.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map(([title, text], i) => (
              <article key={title} className="rounded-[var(--radius-card)] border border-line bg-white p-6">
                <span className="grid size-8.5 place-items-center rounded-xl bg-brand-50 text-sm font-extrabold text-brand-600">0{i + 1}</span>
                <h3 className="mt-4 mb-2 font-bold">{title}</h3>
                <p className="text-sm text-muted">{text}</p>
              </article>
            ))}
            <article className="rounded-[var(--radius-card)] bg-gradient-to-br from-brand-600 to-brand-400 p-6 text-white sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-bold tracking-[0.16em] text-[#c8efff] uppercase">Nuestra propuesta</p>
              <p className="mt-3 text-[1.8rem] leading-tight font-bold">“Crece profesionalmente mientras contribuyes a transformar oportunidades.”</p>
              <p className="mt-3 max-w-[640px] text-[#eef9fe]">Conectamos tu experiencia profesional con el impacto que FUNDAP genera en las comunidades.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Proceso */}
      <section id="proceso" className="scroll-mt-20 py-[58px] md:py-[84px]">
        <div className={container}>
          <div className={sectionHead}>
            <div><p className="eyebrow">Proceso de selección</p><h2 className={h2}>Un proceso claro desde el primer paso.</h2></div>
            <p className="max-w-[560px] text-muted">Explicamos cada etapa antes de que apliques para que sepas qué esperar, cómo avanzará tu candidatura y por qué canales recibirás información.</p>
          </div>
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0 lg:before:absolute lg:before:top-[23px] lg:before:right-[8%] lg:before:left-[8%] lg:before:h-px lg:before:bg-line">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="relative lg:pr-4">
                <span className="relative z-10 grid size-11.5 place-items-center rounded-full border border-line bg-white font-extrabold text-brand-600">{i + 1}</span>
                <h3 className="mt-3.5 mb-1.5 text-[0.95rem] font-bold">{title}</h3>
                <p className="text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-9 flex items-start gap-3.5 rounded-[var(--radius-card-sm)] border border-[#f2dfc3] bg-[#fff7ec] p-4.5">
            <span aria-hidden className="text-2xl">🛡</span>
            <div>
              <p className="font-bold">Reclutamiento seguro</p>
              <p className="text-sm text-[#745f45]">El proceso de aplicación no tiene costo. Desconfía de solicitudes de pago o mensajes que no provengan de canales oficiales de FUNDAP.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vacantes */}
      <section id="vacantes" className="scroll-mt-20 bg-surface py-[58px] md:py-[84px]">
        <div className={container}>
          <div className={sectionHead}>
            <div><p className="eyebrow">Vacantes</p><h2 className={h2}>Ahora sí: encuentra tu próxima oportunidad.</h2></div>
            <p className="max-w-[560px] text-muted">Después de conocer la cultura y el proceso, explora las oportunidades disponibles por área, ubicación y modalidad.</p>
          </div>
          {jobs.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-dashed border-line bg-white p-12 text-center text-muted">
              <strong className="block text-ink">En este momento no hay vacantes publicadas.</strong>
              Vuelve pronto: publicamos nuevas oportunidades constantemente.
            </p>
          ) : (
            <div className="grid gap-3.5">{jobs.slice(0, 6).map((v) => <JobCard key={v.slug} v={v} today={today} />)}</div>
          )}
          {jobs.length > 0 && (
            <div className="mt-8 text-center">
              <Link href="/empleos" className={buttonClass("secondary")}>Ver las {jobs.length} vacantes con filtros</Link>
            </div>
          )}
        </div>
      </section>

      {/* Match de Impacto */}
      <section id="match" className="scroll-mt-20 bg-gradient-to-b from-[#eef8fd] to-[#f8fbfd] py-[58px] md:py-[84px]">
        <div className={`${container} grid gap-7 lg:grid-cols-[.85fr_1.15fr]`}>
          <div className="relative overflow-hidden rounded-[var(--radius-feature)] bg-brand-900 p-8 text-white after:absolute after:-right-30 after:-bottom-35 after:size-75 after:rounded-full after:bg-brand-400/15">
            <p className="text-xs font-bold tracking-[0.16em] text-[#bdeafd] uppercase">¿No sabes qué buscar?</p>
            <h2 className="mt-2 mb-4 text-[2.4rem] leading-[1.05] font-bold tracking-[-0.04em]">Match de Impacto</h2>
            <p className="text-[#d8e7f4]">No necesitas saber el nombre exacto del puesto: cuéntanos qué te gustaría aportar y te mostramos las vacantes abiertas que encajan.</p>
            <ol className="mt-7 grid gap-3 text-sm">
              {["Elige el tipo de impacto que más te motiva.", "Indica dónde prefieres trabajar.", "Recibe vacantes sugeridas para ti."].map((t, i) => (
                <li key={t} className="flex items-start gap-3"><span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-white/15 text-xs">{i + 1}</span>{t}</li>
              ))}
            </ol>
          </div>
          <MatchWizard
            areas={areas.map((a) => ({ slug: a.slug, name: a.name }))}
            branches={branches.map((b) => b.name)}
            jobs={jobs.map((j) => ({ slug: j.slug!, title: j.title, area: j.area?.name ?? null, branches: j.branches.map((b) => b.branch.name) }))}
          />
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="faq" className="scroll-mt-20 py-[58px] md:py-[84px]">
        <div className={container}>
          <div className="mb-8 text-center"><p className="eyebrow">Preguntas frecuentes</p><h2 className={h2}>Antes de aplicar.</h2></div>
          <div className="mx-auto max-w-[900px] space-y-2.5">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-[var(--radius-card-sm)] border border-line bg-white">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold [&::-webkit-details-marker]:hidden">
                  {q}<span aria-hidden className="text-xl text-brand-600 group-open:rotate-45 motion-safe:transition">+</span>
                </summary>
                <p className="px-5 pb-4.5 text-sm text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
