import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import type { Actor } from "./permissions";
import { authSecret, verifyLinkToken } from "./magicLink";

// Acceso por enlace al correo (siempre activo). Google Workspace o Microsoft Entra
// se agregan solos si tienen variables de entorno. Sin contraseñas propias.
const providers: Provider[] = [
  Credentials({
    id: "magic",
    credentials: { token: {} },
    authorize: async (c) => {
      const secret = authSecret();
      const link = secret ? verifyLinkToken(String(c.token ?? ""), secret) : null;
      if (!link) return null;
      // Un solo uso: el nonce queda registrado en auditoría al entrar.
      const used = await db.auditLog.findFirst({ where: { action: "auth.link_used", entityId: link.nonce } });
      const user = await db.user.findUnique({ where: { email: link.email } });
      if (used || !user?.active) return null;
      await db.auditLog.create({ data: { actorId: user.id, action: "auth.link_used", entityType: "user", entityId: link.nonce } });
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];
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
export const oauthProviderIds = () => providerIds.filter((id) => id !== "dev" && id !== "magic");
export const providerIds = providers.map((p) => {
  const c = (typeof p === "function" ? p() : p) as { id: string; options?: { id?: string } };
  return c.options?.id ?? c.id;
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: authSecret(),
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
