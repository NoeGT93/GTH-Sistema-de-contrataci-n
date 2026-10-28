// Semilla idempotente de catálogos. Se puede correr las veces que haga falta.
// Valores marcados "validar con RR. HH." vienen del Excel o son provisionales.
import { PrismaClient, type StageCategory } from "@prisma/client";
import { slugify } from "../src/server/lib/codes";
import { DEFAULT_AGING } from "../src/server/modules/reports/aging";

const db = new PrismaClient();

const PROGRAMS = ["AFAA", "Alumni", "USA"]; // validar con RR. HH. (completar desde el Excel)
const AREAS = ["Administración", "Educación", "Microcrédito", "Salud"];
const BRANCHES = ["Quetzaltenango (Xela)", "Quiché", "San Marcos"]; // completar desde el Excel

// INE: 22 departamentos. ponytail: los 340 municipios se importan del CSV del INE cuando se necesiten (1B, dirección del candidato).
const DEPARTMENTS = [
  "Guatemala", "El Progreso", "Sacatepéquez", "Chimaltenango", "Escuintla", "Santa Rosa", "Sololá",
  "Totonicapán", "Quetzaltenango", "Suchitepéquez", "Retalhuleu", "San Marcos", "Huehuetenango", "Quiché",
  "Baja Verapaz", "Alta Verapaz", "Petén", "Izabal", "Zacapa", "Chiquimula", "Jalapa", "Jutiapa",
];

// Código de Trabajo art. 127. Medios días (24 y 31 dic) cuentan como hábiles. Validar con RR. HH.
const HOLIDAYS: [string, string][] = [
  ["2026-01-01", "Año Nuevo"], ["2026-04-02", "Jueves Santo"], ["2026-04-03", "Viernes Santo"],
  ["2026-05-01", "Día del Trabajo"], ["2026-06-30", "Día del Ejército"], ["2026-09-15", "Independencia"],
  ["2026-10-20", "Revolución de 1944"], ["2026-11-01", "Todos los Santos"], ["2026-12-25", "Navidad"],
  ["2027-01-01", "Año Nuevo"], ["2027-03-25", "Jueves Santo"], ["2027-03-26", "Viernes Santo"],
  ["2027-05-01", "Día del Trabajo"], ["2027-06-30", "Día del Ejército"], ["2027-09-15", "Independencia"],
  ["2027-10-20", "Revolución de 1944"], ["2027-11-01", "Todos los Santos"], ["2027-12-25", "Navidad"],
];

// Pipeline inicial (sección "Estados y transiciones").
const STAGES: [key: string, name: string, publicLabel: string, category: StageCategory][] = [
  ["new", "Nuevo", "Aplicación recibida", "ACTIVE"],
  ["screening", "Precalificación", "En revisión", "ACTIVE"],
  ["profile_review", "Perfil por revisar", "En revisión", "ACTIVE"],
  ["contacted", "Contactado", "En revisión", "ACTIVE"],
  ["interview_hr", "Entrevista RR. HH.", "Entrevistas", "ACTIVE"],
  ["interview_manager", "Entrevista gerencia", "Entrevistas", "ACTIVE"],
  ["interview_final", "Entrevista final", "Entrevistas", "ACTIVE"],
  ["reference_check", "Verificación de referencias", "Etapa final", "ACTIVE"],
  ["offer", "Oferta", "Etapa final", "ACTIVE"],
  ["hired", "Contratado", "Proceso concluido", "HIRED"],
  ["not_qualified", "No cumple requisito", "Proceso concluido", "CLOSED_NEGATIVE"],
  ["not_continued", "No continuó", "Proceso concluido", "CLOSED_NEGATIVE"],
  ["withdrew", "Desistió", "Proceso concluido", "CLOSED_NEGATIVE"],
  ["vacancy_closed", "Vacante cerrada", "Proceso concluido", "CLOSED_NEGATIVE"],
  ["talent_pool", "Base de talento", "Te tendremos en cuenta", "TALENT_POOL"],
];

const CHANNELS = [
  "Facebook", "Instagram", "WhatsApp", "Portal FUNDAP", "Computrabajo", "Referidos",
  "Feria de empleo", "Universidades y aliados", "Afiches y volantes", "Radio",
]; // validar con las columnas de canales del Excel

const VISIT_RATINGS = ["Favorable", "Favorable con observaciones", "No favorable"];
const ONBOARDING_ITEMS = ["Contrato firmado", "Alta en IGSS / seguro", "Alta en sistema", "Informes entregados"];

async function main() {
  for (const name of PROGRAMS) await db.program.upsert({ where: { name }, update: {}, create: { name } });
  for (const name of AREAS)
    await db.area.upsert({ where: { name }, update: {}, create: { name, slug: slugify(name) } });
  for (const name of BRANCHES) await db.branch.upsert({ where: { name }, update: {}, create: { name } });
  for (const [i, name] of DEPARTMENTS.entries()) {
    const id = String(i + 1).padStart(2, "0");
    await db.geoDepartment.upsert({ where: { id }, update: { name }, create: { id, name } });
  }
  for (const [date, name] of HOLIDAYS) {
    const d = new Date(date + "T00:00:00Z");
    await db.holiday.upsert({ where: { date: d }, update: { name }, create: { date: d, name } });
  }
  for (const [i, [key, name, publicLabel, category]] of STAGES.entries()) {
    const data = { name, publicLabel, category, sortOrder: i + 1, requiresReason: category === "CLOSED_NEGATIVE" };
    await db.pipelineStage.upsert({ where: { key }, update: data, create: { key, ...data } });
  }
  for (const name of CHANNELS) {
    const key = slugify(name);
    await db.promotionChannel.upsert({ where: { key }, update: {}, create: { key, name } });
  }
  for (const [i, name] of VISIT_RATINGS.entries())
    await db.visitRating.upsert({ where: { name }, update: {}, create: { name, sortOrder: i + 1 } });
  for (const [i, name] of ONBOARDING_ITEMS.entries())
    await db.onboardingItem.upsert({ where: { name }, update: {}, create: { name, sortOrder: i + 1 } });

  // Texto provisional: el definitivo (y el caso de menores en Alumni) es decisión pendiente de GTH.
  await db.consentVersion.upsert({
    where: { purpose_version: { purpose: "application", version: 1 } },
    update: {},
    create: {
      purpose: "application",
      version: 1,
      text:
        "Autorizo a FUNDAP a usar mis datos y mi CV únicamente para este y otros procesos de selección, " +
        "y a contactarme por teléfono, WhatsApp o correo. Puedo pedir que los eliminen en cualquier momento.",
    },
  });

  await db.setting.upsert({ where: { key: "aging" }, update: {}, create: { key: "aging", value: DEFAULT_AGING } });

  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  if (email) {
    await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name: process.env.SEED_ADMIN_NAME ?? "Administración", role: "SUPERADMIN" },
    });
  }
  console.log("Semilla aplicada.", email ? `Superadmin: ${email}` : "Define SEED_ADMIN_EMAIL para crear el primer usuario.");
}

main().finally(() => db.$disconnect());
