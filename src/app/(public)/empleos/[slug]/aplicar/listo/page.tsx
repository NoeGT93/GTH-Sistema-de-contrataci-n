import Link from "next/link";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Aplicación recibida", robots: { index: false } };

export default async function DonePage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  const code = /^[A-Z0-9]{8}$/.test(codigo ?? "") ? codigo : null;
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">¡Recibimos tu aplicación!</h1>
      {code && (
        <>
          <p className="mt-6 text-muted">Tu código de seguimiento</p>
          <p className="mt-2 font-mono text-4xl font-bold tracking-widest text-brand-900">{code}</p>
          <p className="mt-2 text-sm text-muted">Guárdalo: con él y los últimos 4 dígitos de tu teléfono consultas tu estado.</p>
        </>
      )}
      <ol className="mx-auto mt-10 max-w-sm space-y-3 text-left text-sm">
        <li><strong>1.</strong> RR. HH. revisa tu perfil.</li>
        <li><strong>2.</strong> Si avanzas, te contactamos por teléfono o WhatsApp para una entrevista.</li>
        <li><strong>3.</strong> Puedes ver en qué etapa vas en "Mi candidatura".</li>
      </ol>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/mi-candidatura" className={buttonClass()}>Mi candidatura</Link>
        <Link href="/empleos" className={buttonClass("secondary")}>Ver más vacantes</Link>
      </div>
    </div>
  );
}
