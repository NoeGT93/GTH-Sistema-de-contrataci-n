"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui";

/** Comparte la URL real de la vacante (WhatsApp, Facebook… vía el menú del teléfono) o la copia. */
export function ShareButton({ title, className = "" }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) return navigator.share({ title: `${title} — Empleos FUNDAP`, url }).catch(() => {});
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  return (
    <button type="button" onClick={share} className={`${buttonClass("secondary")} ${className}`}>
      <span aria-live="polite">{copied ? "Enlace copiado" : "Compartir"}</span>
    </button>
  );
}
