import { test } from "node:test";
import assert from "node:assert/strict";
import { businessDays } from "./businessDays";
import { trackingCode, slugify } from "./codes";
import { computeAging } from "../modules/reports/aging";
import { can } from "../auth/permissions";
import { transitionsFrom } from "../modules/vacancies/transitions";

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
