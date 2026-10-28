import { StatusLookup } from "@/components/public/StatusLookup";

export const metadata = { title: "Mi candidatura", robots: { index: false } };

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">Mi candidatura</h1>
      <p className="mt-2 text-muted">Consulta en qué etapa va tu aplicación.</p>
      <div className="mt-8"><StatusLookup /></div>
    </div>
  );
}
