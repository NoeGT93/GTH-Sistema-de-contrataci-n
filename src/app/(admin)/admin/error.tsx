"use client";

import Link from "next/link";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-xl font-bold">No se pudo abrir esta página</h1>
      <p className="text-sm text-muted">Puede que no tengas permiso o que el registro no exista.</p>
      <div className="flex gap-4 text-sm">
        <button onClick={reset} className="text-brand-600 underline">Reintentar</button>
        <Link href="/admin" className="text-brand-600 underline">Ir al dashboard</Link>
      </div>
    </div>
  );
}
