# FUNDAP Talento

Portal de empleo + CRM de reclutamiento para RR. HH. de FUNDAP. Monolito modular en Next.js 15 + PostgreSQL.
El diseño completo está en [`docs/arquitectura.md`](docs/arquitectura.md); `prisma/schema.prisma` es la fuente de verdad del modelo.

## Estado

**Fase 1A · Control de plazas** (en curso)

| Hecho | Pendiente en 1A |
| --- | --- |
| Esquema completo (45 tablas, 1A–1C) y migración inicial | Exportación XLSX de reportes |
| Auth.js (Google Workspace o Microsoft 365, el que tenga variables) + `authorize()` con matriz de permisos | Importación del Excel |
| Auditoría en cada caso de uso | CRUD de catálogos, usuarios y umbrales en el panel |
| Requerimientos y vacantes: estados, historial, prioridad, visibilidad, semáforo en días hábiles | Preguntas de precalificación (UI) |
| Control de plazas con filtros por estado, programa, sucursal y responsable | Municipios del INE (solo departamentos en la semilla) |
| Promoción por canal/aliado con costo y evidencia; directorio de aliados | |
| Dashboard: abiertas, por vencer, vencidas, sin promoción, requerimientos por mes | |
| Cron diario que cierra plazas vencidas | |
| Portal: inicio, `/empleos` con filtros y `/empleos/[slug]` con JSON-LD y aviso de cierre/pausa | |

Siguiente: **1B** (aplicar en 3 pasos con CV, candidatos, pipeline Kanban, Mi candidatura).

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
npm test     # días hábiles, semáforo, permisos, transiciones
npm run lint # tsc --noEmit
```

## Estructura

```
src/
  app/(public)/            portal: /, /empleos, /empleos/[slug]
  app/(admin)/admin/       panel: dashboard, plazas, aliados (+ actions.ts)
  app/api/                 auth, cron
  server/auth/             Auth.js, getActor(), authorize() y matriz de permisos
  server/modules/          vacancies · promotion · reports · audit
  server/lib/              días hábiles, códigos, Result
  components/              ui (design system) · admin · public
prisma/                    schema.prisma · migrations/ · seed.ts
```

Regla: cada caso de uso es una función de servicio que valida con Zod, llama a `authorize()`, corre en transacción y escribe auditoría. Las server actions solo la llaman.

## Despliegue (Vercel)

Variables: las de `.env.example`. `vercel.json` programa el cierre automático a las 00:30 de Guatemala.
Aplicar migraciones con `npm run db:deploy` antes de cada release.
