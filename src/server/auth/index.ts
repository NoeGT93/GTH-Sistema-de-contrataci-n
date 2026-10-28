import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import type { Actor } from "./permissions";

// Proveedor pendiente de decisión (Google Workspace o Microsoft Entra):
// se activa el que tenga variables de entorno. Sin contraseñas propias.
const providers: Provider[] = [];
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID) providers.push(MicrosoftEntraID);

// Solo desarrollo local: entrar con el correo de un usuario existente. Nunca en producción.
export const devLoginEnabled = process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "true";
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      credentials: { email: {} },
      authorize: async (c) => {
        const user = await db.user.findUnique({ where: { email: String(c.email).toLowerCase() } });
        return user?.active ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  );
}

// El id configurado vive en `options.id` (Credentials({ id: "dev" }) conserva id "credentials" por defecto).
export const providerIds = providers.map((p) => {
  const c = (typeof p === "function" ? p() : p) as { id: string; options?: { id?: string } };
  return c.options?.id ?? c.id;
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Solo entra quien RR. HH. dio de alta y sigue activo.
    async signIn({ user }) {
      if (!user.email) return false;
      const u = await db.user.findUnique({ where: { email: user.email.toLowerCase() } });
      return !!u?.active;
    },
  },
});

/**
 * Actor de la petición, leído de la base en cada request: un cambio de rol
 * o una baja aplican de inmediato aunque el JWT siga vigente.
 */
export async function getActor(): Promise<Actor> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (!user?.active) redirect("/login");
  return { id: user.id, role: user.role, name: user.name, email: user.email };
}
