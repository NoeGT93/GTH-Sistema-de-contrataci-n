import { test } from "node:test";
import assert from "node:assert/strict";
import { businessDays } from "./businessDays";
import { trackingCode, slugify } from "./codes";
import { computeAging } from "../modules/reports/aging";
import { can } from "../auth/permissions";
import { transitionsFrom } from "../modules/vacancies/transitions";
import { normalizePhone } from "./phone";
import { isMismatch, publicTimeline } from "../modules/applications/rules";

test("businessDays cuenta como NETWORKDAYS (incluye el día inicial, sin fines de semana ni feriados)", () => {
  const none = new Set<string>();
  assert.equal(businessDays("2026-10-26", "2026-10-26", none), 1); // lunes
  assert.equal(businessDays("2026-10-26", "2026-11-01", none), 5); // lun→dom
  assert.equal(businessDays("2026-10-31", "2026-11-01", none), 0); // sáb→dom
  assert.equal(businessDays("2026-10-19", "2026-10-23", new Set(["2026-10-20"])), 4);
  assert.equal(businessDays("2026-10-23", "2026-10-19", none), 0); // rango invertido
});

test("computeAging: en tiempo, por vencer y vencido según prioridad", () => {
  const h = new Set<string>();
  // Prioridad A = 15 días hábiles; "por vencer" a 5 o menos.
  assert.equal(computeAging({ priority: "A", requestedAt: "2026-10-01" }, h, undefined, "2026-10-07").status, "ON_TIME");
  assert.equal(computeAging({ priority: "A", requestedAt: "2026-10-01" }, h, undefined, "2026-10-15").status, "DUE_SOON");
  const late = computeAging({ priority: "A", requestedAt: "2026-10-01" }, h, undefined, "2026-10-28");
  assert.deepEqual(late, { days: 20, limit: 15, status: "OVERDUE" });
  // Cerrada: cuenta hasta el cierre, no hasta hoy.
  assert.equal(computeAging({ priority: "A", requestedAt: "2026-10-01", closedAt: "2026-10-02" }, h, undefined, "2027-01-01").days, 2);
});

test("permisos: el asesor solo edita sus plazas; marketing no aprueba", () => {
  const advisor = { id: "u1", role: "TALENT_ADVISOR" as const, name: "", email: "" };
  assert.equal(can(advisor, "vacancy.update", { ownerId: "u1" }), true);
  assert.equal(can(advisor, "vacancy.update", { ownerId: "u2" }), false);
  assert.equal(can(advisor, "vacancy.approve"), false);
  assert.equal(can({ ...advisor, role: "MARKETING" }, "vacancy.approve"), false);
  assert.equal(can({ ...advisor, role: "EDITOR" }, "vacancy.read"), false);
});

test("transiciones válidas por estado", () => {
  assert.deepEqual(transitionsFrom("ACTIVE"), ["pause", "close"]);
  assert.deepEqual(transitionsFrom("CLOSED"), ["reactivate", "archive"]);
  assert.deepEqual(transitionsFrom("ARCHIVED"), []);
});

test("códigos y slugs", () => {
  assert.match(trackingCode(), /^[2-9A-HJKMNP-Z]{8}$/);
  assert.equal(slugify("Asesor(a) de Microcrédito — Xela"), "asesor-a-de-microcredito-xela");
});

test("teléfonos a E.164 (+502 por defecto)", () => {
  assert.equal(normalizePhone("5555 1234"), "+50255551234");
  assert.equal(normalizePhone("502-5555-1234"), "+50255551234");
  assert.equal(normalizePhone("+1 (415) 555-0100"), "+14155550100");
  assert.equal(normalizePhone("1234"), null);
  assert.equal(normalizePhone("123456789"), null); // 9 dígitos sin + es ambiguo
});

test("precalificación marca, nunca descarta", () => {
  assert.equal(isMismatch("YES_NO", "yes", "no"), true);
  assert.equal(isMismatch("YES_NO", "yes", "yes"), false);
  assert.equal(isMismatch("SINGLE_CHOICE", ["Diversificado", "Universidad"], "Primaria"), true);
  assert.equal(isMismatch("SINGLE_CHOICE", ["Diversificado", "Universidad"], "Universidad"), false);
  assert.equal(isMismatch("NUMBER", { min: 1 }, "0"), true);
  assert.equal(isMismatch("NUMBER", { min: 1, max: 5 }, "3"), false);
  assert.equal(isMismatch("NUMBER", { min: 1 }, "abc"), true);
  assert.equal(isMismatch("TEXT", null, "lo que sea"), false);
});

test("línea de tiempo pública sin etapas internas repetidas", () => {
  const at = new Date();
  const labels = publicTimeline(
    ["Aplicación recibida", "En revisión", "En revisión", "Entrevistas", "En revisión"].map((label) => ({ label, at })),
  ).map((e) => e.label);
  assert.deepEqual(labels, ["Aplicación recibida", "En revisión", "Entrevistas", "En revisión"]);
});

test("enlace de acceso: firma, vencimiento y manipulación", async () => {
  const { createLinkToken, verifyLinkToken } = await import("../auth/magicLink");
  const now = Date.parse("2026-10-28T12:00:00Z");
  const t = createLinkToken("Ana@Fundap.org", "s3cret", now);
  assert.equal(verifyLinkToken(t, "s3cret", now + 60_000)?.email, "ana@fundap.org");
  assert.equal(verifyLinkToken(t, "s3cret", now + 16 * 60_000), null); // venció (15 min)
  assert.equal(verifyLinkToken(t, "otro", now), null); // otra clave
  const [payload, sig] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ e: "admin@fundap.org", x: now + 1e9, n: "x" })).toString("base64url");
  assert.equal(verifyLinkToken(`${forged}.${sig}`, "s3cret", now), null); // correo cambiado
  assert.equal(verifyLinkToken(payload, "s3cret", now), null); // sin firma
});
