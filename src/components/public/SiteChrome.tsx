import Link from "next/link";
import { buttonClass } from "@/components/ui";

const LINKS = [
  ["/#vida", "Vida FUNDAP"],
  ["/#proceso", "Proceso"],
  ["/empleos", "Vacantes"],
  ["/#match", "Tu Match"],
] as const;

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>
      <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 font-extrabold text-white shadow-[var(--shadow-soft)]">F</span>
      Empleos FUNDAP
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-17 max-w-[1180px] items-center justify-between gap-4 px-4 md:px-6">
        <Brand />
        <nav aria-label="Principal" className="hidden items-center gap-7 text-sm font-semibold text-[#354c60] lg:flex">
          {LINKS.map(([href, label]) => <Link key={href} href={href} className="hover:text-brand-600">{label}</Link>)}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/mi-candidatura" className="hidden text-sm font-bold text-brand-800 hover:text-brand-600 lg:block">Mi candidatura</Link>
          <Link href="/empleos" className={`${buttonClass()} max-sm:hidden`}>Ver vacantes</Link>
          {/* Menú móvil sin JavaScript: <details> es accesible por teclado. */}
          <details className="relative lg:hidden">
            <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-xl [&::-webkit-details-marker]:hidden" aria-label="Abrir menú">☰</summary>
            <nav aria-label="Menú móvil" className="absolute right-0 mt-2 w-64 rounded-[var(--radius-card-sm)] border border-line bg-white p-2 shadow-[var(--shadow-lift)]">
              {[...LINKS, ["/#faq", "Preguntas frecuentes"], ["/mi-candidatura", "Mi candidatura"]].map(([href, label]) => (
                <Link key={href} href={href} className="block rounded-lg px-3 py-3 text-sm font-semibold hover:bg-brand-50">{label}</Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const col = "space-y-2 text-sm text-white/85";
  return (
    <footer className="bg-brand-900 text-[#dce9f4]">
      <div className="mx-auto max-w-[1180px] px-4 pt-12 pb-7 md:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_.8fr_.8fr_.8fr]">
          <div>
            <Brand light />
            <p className="mt-4 max-w-xs text-sm text-white/75">
              Portal de reclutamiento de FUNDAP. El proceso de selección no tiene ningún costo.
            </p>
          </div>
          <div className={col}>
            <h2 className="mb-3 text-sm font-semibold text-white">Explora</h2>
            <Link href="/#vida" className="block">Vida FUNDAP</Link>
            <Link href="/#proceso" className="block">Proceso</Link>
            <Link href="/empleos" className="block">Vacantes</Link>
            <Link href="/#match" className="block">Tu Match</Link>
          </div>
          <div className={col}>
            <h2 className="mb-3 text-sm font-semibold text-white">Candidatos</h2>
            <Link href="/mi-candidatura" className="block">Mi candidatura</Link>
            <Link href="/#faq" className="block">Preguntas frecuentes</Link>
          </div>
          <div className={col}>
            <h2 className="mb-3 text-sm font-semibold text-white">Institucional</h2>
            <a href="https://www.fundap.com.gt/" target="_blank" rel="noopener" className="block">FUNDAP ↗</a>
            <a href="https://www.fundap.com.gt/contacto/" target="_blank" rel="noopener" className="block">Contacto ↗</a>
          </div>
        </div>
        <p className="mt-8 border-t border-white/10 pt-5 text-xs text-white/70">© {new Date().getFullYear()} FUNDAP · Gestión de Talento Humano</p>
      </div>
    </footer>
  );
}
