import Link from "next/link";
import { getActor, signOut } from "@/server/auth";
import { can, type Action } from "@/server/auth/permissions";

export const metadata = { title: "Panel", robots: { index: false } };

// Menú en el orden del trabajo diario de RR. HH. Solo muestra lo que el rol puede abrir;
// cada página vuelve a verificar el permiso en el servidor.
const NAV: { href: string; label: string; permission: Action }[] = [
  { href: "/admin", label: "Dashboard", permission: "report.read" },
  { href: "/admin/plazas", label: "Control de plazas", permission: "vacancy.read" },
  { href: "/admin/aliados", label: "Aliados", permission: "partner.write" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-brand-900 text-white md:min-h-screen">
        <div className="flex items-center justify-between p-5 md:block">
          <Link href="/admin" className="text-lg font-bold">FUNDAP Talento</Link>
          <p className="text-xs text-white/70 md:mt-1">{actor.name}</p>
        </div>
        <nav aria-label="Panel" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.filter((n) => can(actor, n.permission)).map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm whitespace-nowrap hover:bg-white/10">
              {n.label}
            </Link>
          ))}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10">Salir</button>
          </form>
        </nav>
      </aside>
      <main className="min-w-0 bg-[#f7fafc] p-4 md:p-8">{children}</main>
    </div>
  );
}
