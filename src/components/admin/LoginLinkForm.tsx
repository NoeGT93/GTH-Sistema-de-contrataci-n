"use client";

import { startTransition, useActionState } from "react";
import { requestLoginLink, type LinkState } from "@/app/login/actions";
import { Button } from "@/components/ui";

export function LoginLinkForm() {
  const [state, action, pending] = useActionState<LinkState, FormData>(requestLoginLink, null);
  if (state?.sent)
    return (
      <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
        Si tu correo está registrado, te enviamos un enlace para entrar. Revisa tu bandeja (y la carpeta de spam).
      </p>
    );
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <label htmlFor="login-email" className="block text-sm font-medium">Tu correo</label>
      <input id="login-email" name="email" type="email" required autoComplete="email"
        aria-describedby={state?.error ? "login-error" : undefined}
        className="w-full rounded-[var(--radius-control)] border border-line px-3 py-2.5 text-sm" />
      {state?.error && <p id="login-error" role="alert" className="text-sm text-danger">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Enviando…" : "Enviarme un enlace para entrar"}</Button>
    </form>
  );
}
