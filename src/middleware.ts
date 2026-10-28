import { NextResponse, type NextRequest } from "next/server";

// Atribución desde la Fase 1B: primer y último toque en cookies del portal.
// Último toque = cada visita con UTM, identificador de anuncio o referrer externo.
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const IDS = ["fbclid", "gclid", "ttclid"] as const;
export const FIRST_TOUCH = "fundap_ft";
export const LAST_TOUCH = "fundap_lt";
const MAX_AGE = 60 * 60 * 24 * 90;

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const referrer = req.headers.get("referer") ?? undefined;
  const refHost = (() => {
    try {
      return referrer ? new URL(referrer).host : undefined;
    } catch {
      return undefined; // referer malformado
    }
  })();
  const externalRef = refHost && refHost !== url.host ? referrer : undefined;
  const params = Object.fromEntries(
    UTM.map((k) => [k.replace(/_(\w)/, (_, c) => c.toUpperCase()), url.searchParams.get(k)?.slice(0, 200)]).filter(([, v]) => v),
  );
  const externalIds = Object.fromEntries(IDS.map((k) => [k, url.searchParams.get(k)?.slice(0, 300)]).filter(([, v]) => v));
  const hasSignal = Object.keys(params).length > 0 || Object.keys(externalIds).length > 0 || externalRef;
  const hasFirst = req.cookies.has(FIRST_TOUCH);
  if (!hasSignal && hasFirst) return NextResponse.next();

  const touch = JSON.stringify({
    ...params,
    ...(Object.keys(externalIds).length ? { externalIds } : {}),
    referrer: externalRef?.slice(0, 500),
    landingPath: url.pathname.slice(0, 300),
    at: new Date().toISOString(),
  });
  const res = NextResponse.next();
  const opts = { maxAge: MAX_AGE, httpOnly: true, sameSite: "lax" as const, secure: url.protocol === "https:", path: "/" };
  if (!hasFirst) res.cookies.set(FIRST_TOUCH, touch, opts);
  if (hasSignal) res.cookies.set(LAST_TOUCH, touch, opts);
  return res;
}

export const config = {
  // Solo páginas del portal (no panel, API ni estáticos).
  matcher: ["/((?!admin|api|login|_next|favicon.ico|.*\\.).*)"],
};
