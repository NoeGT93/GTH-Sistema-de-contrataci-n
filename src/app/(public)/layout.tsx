import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
        <nav aria-label="Principal" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-bold text-brand-900">Empleos FUNDAP</Link>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/empleos" className="hover:text-brand-600">Vacantes</Link>
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-20 bg-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-white/80">
          <p className="font-semibold text-white">FUNDAP · Gestión de Talento Humano</p>
          <p className="mt-2">El proceso de selección no tiene ningún costo. Nunca pedimos pagos para aplicar.</p>
        </div>
      </footer>
    </>
  );
}
