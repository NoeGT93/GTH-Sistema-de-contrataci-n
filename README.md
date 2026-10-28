# FUNDAP Talento

Portal de empleo + CRM de reclutamiento para RR. HH. de FUNDAP. Monolito modular en Next.js 15 + PostgreSQL.
El diseño completo está en [`docs/arquitectura.md`](docs/arquitectura.md); `prisma/schema.prisma` es la fuente de verdad del modelo.

## Estado

**Fase 1B · Portal + candidatos** (hecha)

- Aplicar en 3 pasos (Contacto · Precalificación · CV y consentimiento), mobile first, con botón fijo en móvil
- CV directo al bucket con URL prefirmada (PDF/DOC/DOCX, 5 MB, tamaño verificado al enviar); limpieza diaria de huérfanos
- Deduplicación por teléfono E.164; no se aplica dos veces a la misma plaza (el segundo intento actualiza el contacto)
- Precalificación que marca `needsReview`, nunca descarta; editor de preguntas en la ficha de la plaza
- Atribución primer/último toque (UTM, referrer, página de entrada, fbclid/gclid) desde cookies del middleware
- Código de seguimiento + "Mi candidatura" con etiquetas públicas y límite de 5 intentos fallidos por IP (15 min)
- Candidatos (lista, ficha, notas, historial unificado), aplicación manual (feria, referido, aliado), asignación
- Pipeline Kanban por plaza: arrastrar o selector por tarjeta; motivo obligatorio en etapas cerradas
- Contratado crea la contratación y su checklist; reabrir una aplicación cerrada solo Coordinación RR. HH.
- Entrevistas (RR. HH., gerencia, final) con resultado; descarga de CV auditada
- Cerrar una plaza mueve sus aplicaciones activas a "Vacante cerrada" o "Base de talento"
- Correos de confirmación y de cambio de etapa pública (Resend)
- Dashboard: conversión por etapa (solo cifras)

Siguiente: **1C** (expediente, visitas, semana de prueba, bajas, agenda, tareas, metas, CMS, base de talento, Match).

**Fase 1A · Control de plazas**

| Hecho | Pendiente en 1A |
| --- | --- |
| Esquema completo (45 tablas, 1A–1C) y migración inicial | Exportación XLSX de reportes |
| Auth.js (Google Workspace o Microsoft 365, el que tenga variables) + `authorize()` con matriz de permisos | Importación del Excel |
| Auditoría en cada caso de uso | CRUD de catálogos, usuarios y umbrales en el panel |
| Requerimientos y vacantes: estados, historial, prioridad, visibilidad, semáforo en días hábiles | |
| Control de plazas con filtros por estado, programa, sucursal y responsable | Municipios del INE (solo departamentos en la semilla) |
| Promoción por canal/aliado con costo y evidencia; directorio de aliados | |
| Dashboard: abiertas, por vencer, vencidas, sin promoción, requerimientos por mes | |
| Cron diario que cierra plazas vencidas | |
| Portal: inicio, `/empleos` con filtros y `/empleos/[slug]` con JSON-LD y aviso de cierre/pausa | |

## Desarrollo local

```bash
cp .env.example .env          # DATABASE_URL, AUTH_SECRET y AUTH_DEV_LOGIN=true
npm install
npm run db:migrate            # crea las tablas
SEED_ADMIN_EMAIL=tu@correo npm run db:seed
npm run dev                   # http://localhost:3000/login
```

Con `AUTH_DEV_LOGIN=true` (solo fuera de producción) se entra escribiendo el correo de un usuario existente.
En producción solo entran usuarios dados de alta y activos en `users`, vía Google o Microsoft.

```bash
npm test     # días hábiles, semáforo, permisos, transiciones, teléfonos, precalificación
npm run lint # tsc --noEmit
```

## Estructura

```
src/
  app/(public)/            portal: /, /empleos, /empleos/[slug], /aplicar, /mi-candidatura
  app/(admin)/admin/       panel: dashboard, plazas, candidatos, pipeline, aliados (+ actions.ts)
  app/api/                 auth, cron, subida de CV, descarga auditada
  middleware.ts            atribución (primer y último toque)
  server/integrations/     storage (S3 / disco en dev) · email (Resend)
  server/auth/             Auth.js, getActor(), authorize() y matriz de permisos
  server/modules/          vacancies · applications · candidates · promotion · reports · audit
  server/lib/              días hábiles, códigos, Result
  components/              ui (design system) · admin · public
prisma/                    schema.prisma · migrations/ · seed.ts
```

Regla: cada caso de uso es una función de servicio que valida con Zod, llama a `authorize()`, corre en transacción y escribe auditoría. Las server actions solo la llaman.

## Despliegue (Vercel)

El build **no** necesita base de datos. En producción, `vercel-build` aplica las migraciones y la semilla (idempotente) antes de compilar; los previews no tocan la base.

1. **Base de datos:** en el proyecto de Vercel → *Storage* → crea una base Postgres (Neon) y conéctala al proyecto. Vercel agrega `DATABASE_URL` sola.
2. **Variables** (*Settings → Environment Variables*, entorno Production):
   - `AUTH_SECRET` — genera uno con `npx auth secret`.
   - `SEED_ADMIN_EMAIL` y `SEED_ADMIN_NAME` — el primer superadmin (tu correo de Google o Microsoft).
   - Inicio de sesión: `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` (Google Cloud → Credenciales → ID de cliente OAuth, URI de redirección `https://TU-DOMINIO/api/auth/callback/google`) **o** las de Microsoft Entra.
   - `CRON_SECRET` — cualquier texto largo y aleatorio.
   - CV: `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (bucket privado con CORS que permita `PUT` desde el dominio).
   - Correo: `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`.
3. **Redeploy.** Las migraciones y catálogos se aplican solos; entra en `/login` con el correo de `SEED_ADMIN_EMAIL`.

`vercel.json` programa el cierre automático (00:30 de Guatemala) y la limpieza de CV huérfanos.

## Diseño

La landing sigue el prototipo [`docs/prototipo-portal-v3.html`](docs/prototipo-portal-v3.html) (especificación visual y de contenido, no código base): hero con buscador, Vida FUNDAP, proceso, vacantes reales, Match de Impacto sin porcentajes inventados y FAQ.
