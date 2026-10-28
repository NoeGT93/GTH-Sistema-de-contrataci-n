import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/server/auth";
import { Button } from "@/components/ui";

export const metadata = { title: "Entrar", robots: { index: false } };

// El enlace abre esta página y se entra con un clic: así los antivirus de correo que
// visitan enlaces automáticamente no gastan el enlace de un solo uso.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-brand-900 p-4">
      <form
        className="w-full max-w-sm space-y-5 rounded-[var(--radius-card)] bg-white p-8"
        action={async () => {
          "use server";
          try {
            await signIn("magic", { token, redirectTo: "/admin" });
          } catch (e) {
            // Enlace vencido, reutilizado o falso. El redirect de éxito no es AuthError y sigue su curso.
            if (e instanceof AuthError) redirect("/login?error=CredentialsSignin");
            throw e;
          }
        }}
      >
        <h1 className="text-xl font-bold">FUNDAP Talento</h1>
        <p className="text-sm text-muted">Confirma para entrar al panel.</p>
        <Button className="w-full">Entrar al panel</Button>
      </form>
    </main>
  );
}
