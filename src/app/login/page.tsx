import { redirect } from "next/navigation";
import { auth, devLoginEnabled, providerIds, signIn } from "@/server/auth";
import { Button } from "@/components/ui";

export const metadata = { title: "Ingresar", robots: { index: false } };

const NAMES: Record<string, string> = { google: "Google Workspace", "microsoft-entra-id": "Microsoft 365" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await auth())?.user) redirect("/admin");
  const { error } = await searchParams;
  const oauth = providerIds.filter((id) => id !== "dev");
  return (
    <main className="grid min-h-screen place-items-center bg-brand-900 p-4">
      <div className="w-full max-w-sm space-y-5 rounded-[var(--radius-card)] bg-white p-8">
        <h1 className="text-xl font-bold">FUNDAP Talento</h1>
        {error && (
          <p role="alert" className="text-sm text-danger">
            No pudimos validar tu acceso. Pide a Coordinación RR. HH. que te dé de alta.
          </p>
        )}
        {oauth.map((id) => (
          <form key={id} action={async () => { "use server"; await signIn(id, { redirectTo: "/admin" }); }}>
            <Button className="w-full">Entrar con {NAMES[id] ?? id}</Button>
          </form>
        ))}
        {devLoginEnabled && (
          <form
            className="space-y-2 border-t border-line pt-4"
            action={async (fd: FormData) => { "use server"; await signIn("dev", { email: fd.get("email"), redirectTo: "/admin" }); }}
          >
            <label htmlFor="email" className="block text-sm font-medium">Correo (solo desarrollo)</label>
            <input id="email" name="email" type="email" required className="w-full rounded-[var(--radius-control)] border border-line px-3 py-2 text-sm" />
            <Button variant="secondary" className="w-full">Entrar</Button>
          </form>
        )}
        {providerIds.length === 0 && (
          <p className="text-sm text-muted">Configura AUTH_GOOGLE_ID o AUTH_MICROSOFT_ENTRA_ID_ID (ver README).</p>
        )}
      </div>
    </main>
  );
}
