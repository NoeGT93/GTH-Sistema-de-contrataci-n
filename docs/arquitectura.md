# FUNDAP Talento — Arquitectura y diseño técnico (Etapa 2)

Oct 23, 2026 · @Noe

## Resumen y decisiones aprobadas

FUNDAP Talento será un monolito modular en Next.js + PostgreSQL que reemplaza primero el Excel de control de plazas de RR. HH. y después publica el portal de empleo. Este documento fija el modelo de datos, los estados, las reglas de KPIs, los permisos, la API, la navegación y el design system para construir la Fase 1A.

Decisiones aprobadas:

| Tema | Decisión |
| --- | --- |
| Prototipo HTML | Se usa como especificación visual y de contenido, no como código base |
| Orden del MVP | 1A Control de plazas → 1B Portal + candidatos → 1C Ingresos y operación → 2 Marketing → 3 Conversaciones e IA |
| Vacante | Una sola entidad con dos vistas: operativa (Control de plazas) y de publicación (Vacantes) |
| Visibilidad | Pública, interna o no publicar; solo las públicas llegan al portal |
| Catálogos | Programas, sucursales, geografía, feriados, canales de promoción y escalas viven en base de datos |
| Pipeline | Incluye entrevista RR. HH., gerencia, final y verificación de referencias antes de la oferta |
| Ingreso | Expediente, visita domiciliaria, semana de prueba y bajas forman un módulo propio, separado del pipeline |
| Datos sensibles | Expediente, visitas y verificaciones bajo un permiso específico y con lecturas auditadas |
| Atribución | Se captura desde la Fase 1B (UTM, referrer, página de entrada), aunque el módulo de campañas llegue en Fase 2 |
| Historial | Nunca se borra información operativa: estados, archivado y auditoría |

Reglas de producto que guían cada decisión: atraer mejores candidatos, facilitar aplicar, reducir trabajo operativo, mejorar el seguimiento, medir resultados de Marketing y ayudar a RR. HH. a decidir mejor.

## Arquitectura técnica

Una sola aplicación Next.js (App Router, TypeScript estricto) sirve el portal y el panel; la lógica de negocio vive en módulos de servidor por dominio y nunca en los componentes.

| Capa | Elección | Motivo |
| --- | --- | --- |
| Framework | Next.js 15 App Router + React + TypeScript `strict` | SSR/ISR para SEO del portal, server actions para el panel, un solo despliegue |
| UI | Tailwind CSS + componentes propios (base Radix para accesibilidad de diálogos, menús y selects) | Design system FUNDAP sin depender de un kit visual ajeno |
| Validación | Zod, compartido entre formulario y servidor | Un solo esquema por caso de uso |
| Base de datos | PostgreSQL 16 gestionado (Neon/Supabase o RDS) | Relacional, JSONB para contenido CMS y respuestas |
| ORM | Prisma | Migraciones versionadas y tipos generados |
| Autenticación | Auth.js con Google Workspace o Microsoft Entra (pendiente confirmar) | Sin contraseñas propias; bajas de personal heredadas |
| Archivos | S3, bucket privado exclusivo para CV y expedientes; URLs prefirmadas | Las subidas no pasan por funciones serverless; descargas auditadas |
| Correo | Amazon SES o Resend | Confirmaciones y avisos de cambio de etapa |
| Tareas programadas | Vercel Cron en Fase 1; cola (Inngest o Trigger.dev) en Fase 2 | Cierre automático por fecha, recordatorios, sincronización con Meta |
| Despliegue | Vercel + entornos preview por rama | Rápido de operar; nada impide mover a AWS después |

Principios de implementación:

- Cada caso de uso es una función de servicio: valida con Zod, verifica permisos con `authorize()`, ejecuta en transacción y escribe auditoría. Server actions y route handlers solo la llaman.
- El portal público solo lee vistas públicas (`PublicVacancy`); nunca recibe datos administrativos.
- Integraciones (correo, almacenamiento, IA, Meta, WhatsApp) detrás de interfaces en `server/integrations`, intercambiables por proveedor.
- Sin estado global en el cliente: el estado vive en la URL (filtros, pestañas) y en el servidor.

Estructura de carpetas:

```
src/
  app/
    (public)/            portal: /, /empleos, /empleos/[slug], /mi-candidatura…
    (admin)/admin/       panel: dashboard, plazas, candidatos, pipeline…
    api/                 webhooks, uploads prefirmados, cron
  server/
    auth/                sesión, authorize(), matriz de permisos
    modules/
      vacancies/         service.ts · schemas.ts · queries.ts · policies.ts
      applications/
      candidates/
      hiring/            contrataciones, expediente, visitas, prueba
      promotion/         canales, aliados, (campañas en F2)
      operations/        tareas, agenda, metas
      cms/
      reports/           KPIs y agregados
      audit/
    integrations/        storage · email · ai · meta · whatsapp
    lib/                 businessDays, slug, tracking codes
  components/
    ui/                  design system (Button, Badge, Field, Dialog…)
    public/              JobCard, ApplyWizard, StatusTimeline…
    admin/               DataTable, KanbanBoard, AgingBadge…
prisma/
  schema.prisma · migrations/ · seed.ts
```

## Modelo de datos

El esquema validado tiene 45 tablas en PostgreSQL agrupadas en 8 dominios, todas para las Fases 1A a 1C; campañas y conversaciones se agregan en su fase sin romper lo existente. El archivo `prisma/schema.prisma` es la fuente de verdad; esta sección explica sus decisiones.

| Dominio | Tablas | Fase |
| --- | --- | --- |
| Usuarios y auditoría | `users`, `audit_logs`, `settings` | 1A |
| Catálogos | `programs`, `areas`, `branches`, `geo_departments`, `geo_municipalities`, `holidays`, `pipeline_stages`, `promotion_channels`, `visit_ratings`, `onboarding_items` | 1A |
| Plazas | `vacancies`, `vacancy_branches`, `vacancy_status_events`, `screening_questions` | 1A |
| Promoción | `vacancy_promotions`, `partners`, `partner_contacts` | 1A |
| Candidatos | `candidates`, `candidate_interests`, `consent_versions`, `consents`, `tags`, `candidate_tags`, `notes` | 1B |
| Aplicaciones | `applications`, `application_answers`, `application_stage_events`, `attribution_touches`, `interviews`, `interview_participants` | 1B |
| Ingreso (restringido) | `hires`, `hire_checklist_items`, `home_visits`, `home_visit_visitors`, `background_checks` | 1C |
| Operación y contenido | `tasks`, `team_events`, `team_event_attendees`, `goals`, `files`, `content_blocks`, `content_versions` | 1A–1C |

Núcleo del modelo: **Candidato → Aplicación ← Vacante**; la contratación (`hires`) nace de la aplicación y vive en la zona restringida junto con expediente, visitas y verificaciones.

Todo lo que ocurre en un proceso cuelga de la aplicación; la contratación nace de ella y vive en una zona con permiso propio.

Decisiones de modelado:

- **Candidato ↔ Aplicación ↔ Vacante.** Un candidato tiene muchas aplicaciones; la combinación candidato + vacante es única. Lo que cambia por postulación (CV, respuestas, motivación, origen) vive en la aplicación, no en el candidato.
- **Deduplicación.** El teléfono normalizado a E.164 (+502) es único y obligatorio; el correo es único pero opcional, porque muchos candidatos de campo no lo usan.
- **Programa y área son distintos.** `programs` es quien solicita la plaza (AFAA, USA, Alumni…); `areas` es la categoría que ve el candidato en el portal (Microcrédito, Educación, Salud…).
- **Vacante con varias sedes.** `vacancy_branches` cubre las plazas Alumni de "Xela, San Marcos y Quiché" y permite repartir posiciones por sede.
- **Posiciones cubiertas se calculan.** Se cuentan contrataciones (`hires`) de la vacante; nunca se escriben a mano, así los totales siempre cuadran.
- **Historial en tablas de eventos.** `vacancy_status_events` y `application_stage_events` registran cada cambio con actor y fecha; son la base de todos los KPIs de tiempo. `audit_logs` cubre el resto de acciones, incluidas las lecturas de datos restringidos.
- **Etapas configurables con categoría.** Cada etapa tiene `category` (activa, contratado, cerrada negativa, base de talento) y `publicLabel`; agregar o renombrar etapas no rompe reportes ni lo que ve el candidato.
- **Precalificación sin descarte automático.** Una respuesta que no coincide con la esperada marca `mismatch` y `needsReview`; la decisión siempre es de una persona.
- **Atribución en dos toques.** `attribution_touches` guarda primer y último contacto por aplicación (UTM, referrer, página de entrada, identificadores externos). En Fase 2 se enlazan a `campaigns` por `utm_campaign`.
- **Promoción como registro, no como casillas.** Cada canal usado para una plaza es una fila con fecha, responsable, costo opcional en quetzales y evidencia. El checklist del Excel se deriva de ahí.
- **Ingreso separado de la selección.** `hires` nace al pasar a Contratado y concentra período de prueba y baja; checklist, visitas y verificaciones cuelgan de ella o de la aplicación, con permiso propio.
- **Archivos siempre privados por defecto.** `files` guarda la llave de almacenamiento; solo imágenes de vacante y CMS pueden ser públicas.
- **CMS por bloques tipados.** `content_blocks` tiene borrador y publicado en JSON validado por Zod según la clave del bloque; cada publicación crea una versión.
- **Retención preparada.** `candidates.anonymizedAt` y `files.deletedAt` permiten aplicar la política que defina GTH sin borrar el historial agregado.

## Estados y transiciones

Toda transición pasa por una función de servicio que valida que esté permitida, exige motivo cuando corresponde y escribe el evento de historial en la misma transacción.

**Vacante**

| Desde | Hacia | Quién | Condición o efecto |
| --- | --- | --- | --- |
| Pendiente de aprobación | Borrador | Coordinación RR. HH. | Registra `approvedAt` |
| Borrador | Activa | Coordinación RR. HH. o responsable | Exige título, sede, área y fecha de cierre si es pública. Asigna `slug` y `publishedAt` la primera vez |
| Activa | Pausada | Coordinación o responsable | Motivo obligatorio. Desaparece del listado público; su URL muestra "temporalmente pausada" |
| Pausada | Activa | Coordinación o responsable | Conserva el mismo `slug` |
| Activa o Pausada | Cerrada | Coordinación o responsable | Motivo de cierre obligatorio. Ofrece mover aplicaciones activas a "Vacante cerrada" o "Base de talento" |
| Activa | Cerrada | Sistema (cron diario) | Al pasar `closesAt`, motivo "Fecha de cierre" |
| Cerrada | Activa | Coordinación RR. HH. | Reactivación con motivo; conserva historial y URL |
| Cerrada | Archivada | Coordinación RR. HH. | Sale de las vistas operativas; nunca se borra |

Una vacante cerrada conserva su página pública con aviso de cierre, vacantes similares y registro en la base de talento, porque anuncios y QR siguen circulando.

**Aplicación (pipeline inicial)**

| Orden | Etapa interna | Categoría | Etiqueta pública |
| --- | --- | --- | --- |
| 1 | Nuevo | Activa | Aplicación recibida |
| 2 | Precalificación | Activa | En revisión |
| 3 | Perfil por revisar | Activa | En revisión |
| 4 | Contactado | Activa | En revisión |
| 5 | Entrevista RR. HH. | Activa | Entrevistas |
| 6 | Entrevista gerencia | Activa | Entrevistas |
| 7 | Entrevista final | Activa | Entrevistas |
| 8 | Verificación de referencias | Activa | Etapa final |
| 9 | Oferta | Activa | Etapa final |
| 10 | Contratado | Contratado | Proceso concluido |
| — | No cumple requisito | Cerrada negativa | Proceso concluido |
| — | No continuó | Cerrada negativa | Proceso concluido |
| — | Desistió | Cerrada negativa | Proceso concluido |
| — | Vacante cerrada | Cerrada negativa | Proceso concluido |
| — | Base de talento | Base de talento | Te tendremos en cuenta |

Reglas del pipeline: se puede avanzar o retroceder entre etapas activas; las etapas cerradas exigen motivo; pasar a Contratado crea el registro de `hires` y su checklist; una aplicación cerrada solo se reabre por Coordinación RR. HH.

**Contratación e ingreso**

| Entidad | Estados | Regla |
| --- | --- | --- |
| Contratación | Activa → Baja | La baja exige fecha y tipo (renuncia, despido, fin de contrato, no aprobó prueba, otro) |
| Semana de prueba | Pendiente → Aprobada o No aprobada | "No aprobada" ofrece registrar la baja en el mismo paso |
| Visita domiciliaria | Pendiente → Realizada, No aplica o Cancelada | "Realizada" exige fecha, modalidad, quién la hizo y resultado |
| Checklist de ingreso | Cada ítem pendiente o hecho | El expediente está completo cuando todos los ítems activos tienen fecha |
| Tarea | Abierta → Hecha o Cancelada | Al completar una tarea recurrente se crea la siguiente |

## Reglas de negocio y KPIs

Todos los indicadores se calculan desde el historial de eventos, nunca se capturan a mano, y usan días hábiles reales: lunes a viernes menos los feriados de la tabla `holidays`.

| Indicador | Definición | Fuente |
| --- | --- | --- |
| Días hábiles abiertos | Desde la fecha de requerimiento hasta hoy, o hasta el cierre | `vacancies.requestedAt`, `closedAt` |
| Estado del plazo | En tiempo, por vencer (5 días hábiles o menos para el límite) o vencido, según prioridad: A = 15, B = 30, C = 45 días hábiles | Prioridad + días hábiles abiertos |
| Tiempo de contratación | Desde la fecha de requerimiento hasta la entrada a Contratado, por cada posición cubierta | `requestedAt` + `application_stage_events` |
| Duración del proceso | Desde la primera entrevista de la aplicación hasta la entrada a Oferta | `interviews` + `application_stage_events` |
| Plazas por mes | Requerimientos recibidos por mes y programa (ver decisión pendiente sobre posiciones) | `requestedAt`, `programId` |
| Meta semanal | Entrevistas con gerencia o finales programadas en la semana por asesor, contra la meta (6 por defecto) | `interviews`, `goals` |
| Conversión por etapa | Porcentaje de aplicaciones que alcanzó cada etapa, por vacante, fuente o periodo | `application_stage_events` |
| Plazas sin promoción | Vacantes activas sin ningún registro de promoción después de 3 días hábiles | `vacancy_promotions` |
| Retención a 90 días | Contrataciones sin baja 90 días después del inicio, sobre las que ya cumplieron 90 días | `hires` |
| Calidad por fuente | Retención y aprobación de prueba agrupadas por canal o aliado de origen | `hires` + atribución |

Cálculo de días hábiles, contando el día inicial como el `NETWORKDAYS` del Excel:

```latex
\text{dh}(a,b) = \left|\{\, d \in [a,b] : d \notin \{\text{sáb},\text{dom}\},\ d \notin \text{feriados} \,\}\right|
```

Otras reglas:

- El semáforo del Excel se reemplaza por el estado del plazo; sus umbrales viven en `settings` para ajustarlos sin código.
- La vacante pública exige fecha de cierre; si no se define, el sistema propone apertura + 30 días.
- Al cubrir todas las posiciones, el sistema propone cerrar la vacante con motivo "Cubierta"; no la cierra solo.
- Una persona puede aplicar a varias vacantes, pero no dos veces a la misma; un segundo intento actualiza datos de contacto y no crea duplicados.
- El código de seguimiento usa 8 caracteres aleatorios sin caracteres ambiguos y se consulta junto con los últimos 4 dígitos del teléfono; tras 5 intentos fallidos por IP se aplica espera.
- Toda descarga de CV, lectura de expediente, visita o verificación queda en `audit_logs`.

## Roles y permisos

Los permisos se definen en código como acción + recurso + alcance, y una sola función `authorize(usuario, acción, recurso)` los aplica en cada server action, route handler y consulta; el frontend solo oculta lo que el servidor ya niega.

| Permiso | Superadmin | Coord. RR. HH. | Asesor de talento | Marketing | Editor | Gerencia |
| --- | --- | --- | --- | --- | --- | --- |
| Ver plazas | Todas | Todas | Todas (lectura) y propias (edición) | Públicas, lectura | — | Agregado |
| Crear y editar plazas | Sí | Sí | Propias | — | — | — |
| Aprobar, publicar, cerrar, reactivar | Sí | Sí | Publicar, pausar y cerrar propias | — | — | — |
| Registrar promoción y aliados | Sí | Sí | Propias | Sí | — | — |
| Ver candidatos y aplicaciones | Todos | Todos | De sus plazas o asignados | — | — | — |
| Descargar CV | Sí | Sí | De sus plazas o asignados | — | — | — |
| Mover etapas, notas, entrevistas | Sí | Sí | De sus plazas o asignados | — | — | — |
| Expediente, visitas, verificaciones | Sí | Sí | Solo visitas que realizó | — | — | — |
| Bajas y semana de prueba | Sí | Sí | Lectura de sus contrataciones | — | — | — |
| Agenda, tareas, metas | Sí | Sí, de todo el equipo | Propias | Propias | — | — |
| Contenido del portal | Sí | — | — | Sí | Sí | — |
| Reportes | Todos | Todos | De sus plazas | Promoción y fuentes, sin datos personales | — | Agregados |
| Usuarios y configuración | Sí | Catálogos | — | — | — | — |

Reglas de datos restringidos:

- Marketing, Editor y Gerencia nunca ven nombres, contactos ni CV; sus reportes solo reciben cifras agregadas.
- La lectura de expediente, visitas o verificaciones genera un registro de auditoría aunque no se modifique nada.
- El alcance "por sede" queda preparado (pendiente de decisión): bastaría una tabla `user_branches` y un filtro en `authorize()`.
- Ningún formulario ni plantilla tiene campos de sexo, edad, religión, etnia o estado civil como requisito de una plaza, y el asistente de IA no podrá usarlos.

## API

El panel usa server actions y el portal usa server components más dos endpoints públicos; los route handlers HTTP se reservan para lo que llama alguien externo (navegador al subir archivos, cron, webhooks de Meta y WhatsApp en fases posteriores).

Contrato común de cada caso de uso:

```ts
// server/modules/vacancies/service.ts
export async function publishVacancy(actor: Actor, input: PublishVacancyInput): Promise<Result<VacancyDTO>> {
  const data = publishVacancySchema.parse(input);          // Zod
  await authorize(actor, "vacancy.publish", { vacancyId: data.id });
  return db.$transaction(async (tx) => {
    // valida transición, asigna slug, escribe vacancy_status_events y audit_logs
  });
}
// Result = { ok: true, data } | { ok: false, error: { code, message, fields? } }
```

**Portal público (sin sesión)**

| Operación | Tipo | Notas |
| --- | --- | --- |
| Listar vacantes con filtros | Server component | Solo `ACTIVE` + `PUBLIC`; filtros en query string; ISR con revalidación al publicar |
| Detalle de vacante | Server component | `/empleos/[slug]`; JSON-LD `JobPosting`; cerrada = aviso + similares |
| `POST /api/public/uploads` | Route handler | Devuelve URL prefirmada para el CV (PDF/DOC/DOCX, 5 MB máx.) con llave temporal |
| `submitApplication` | Server action | Valida, deduplica candidato, crea aplicación, respuestas, consentimiento y atribución; envía correo |
| `checkApplicationStatus` | Server action | Código + últimos 4 dígitos; devuelve solo etiquetas públicas; con límite de intentos |
| `joinTalentPool` | Server action | Crea o actualiza candidato con intereses y consentimiento propio |

**Panel (con sesión)**

| Módulo | Operaciones principales |
| --- | --- |
| Plazas | `createRequisition`, `approveVacancy`, `updateVacancy`, `duplicateVacancy`, `publishVacancy`, `pauseVacancy`, `closeVacancy`, `reactivateVacancy`, `archiveVacancy`, `setScreeningQuestions`, `listVacancies(filtros)` |
| Promoción | `addPromotion`, `removePromotion`, `upsertPartner`, `upsertPartnerContact` |
| Candidatos | `listCandidates`, `getCandidate`, `updateCandidate`, `tagCandidate`, `addNote`, `createApplicationManual` (feria, referido, aliado) |
| Pipeline | `moveApplication(id, stageKey, reason?)`, `bulkMove(ids, stageKey, reason)`, `assignApplication`, `scheduleInterview`, `recordInterviewResult` |
| Archivos | `getFileDownloadUrl(fileId)` → URL firmada de 5 minutos + auditoría |
| Ingreso | `recordBackgroundCheck`, `updateChecklistItem`, `scheduleVisit`, `recordVisit`, `recordProbationResult`, `recordSeparation` |
| Operación | `upsertTask`, `completeTask`, `upsertTeamEvent`, `setGoal` |
| Contenido | `saveContentDraft(key, data)`, `publishContent(key)`, `listContentVersions(key)` |
| Reportes | `getDashboard(filtros)`, `getVacancyAging`, `getTimeToHire`, `getMonthlyRequisitions`, `getFunnel`, `getRetention`; exportación a XLSX |
| Administración | `upsertUser`, `deactivateUser`, CRUD de catálogos y `updateSettings` |

**Tareas programadas (Vercel Cron)**

| Tarea | Frecuencia |
| --- | --- |
| Cerrar vacantes con `closesAt` vencido | Diario, 00:30 hora de Guatemala |
| Avisos de plazos por vencer y visitas pendientes | Diario, 07:00 |
| Generar tareas recurrentes vencidas | Diario |
| Limpiar subidas huérfanas (CV sin aplicación después de 24 h) | Diario |

## Navegación

El portal es mobile first con la vacante como página de aterrizaje de campañas; el panel organiza el menú en el orden del trabajo diario de RR. HH., con Control de plazas como primera pantalla operativa.

**Portal público**

| Ruta | Contenido | Fase |
| --- | --- | --- |
| `/` | Hero + búsqueda, vacantes destacadas, Vida FUNDAP, beneficios, proceso, testimonios, Match, base de talento, FAQ | 1B |
| `/empleos` | Listado; filtros `?area=&sede=&modalidad=&q=&orden=` | 1B |
| `/empleos/[slug]` | Detalle; botón Aplicar fijo en móvil; aviso antifraude | 1B |
| `/empleos/[slug]/aplicar` | Formulario en 3 pasos | 1B |
| `/empleos/[slug]/aplicar/listo` | Código de seguimiento y próximos pasos | 1B |
| `/mi-candidatura` | Consulta de estado | 1B |
| `/talento` | Registro en base de talento | 1C |
| `/match` | Match de Impacto | 1C |
| `/preguntas-frecuentes`, `/privacidad` | Contenido del CMS | 1B |
| `/r/[codigo]` | Enlaces cortos y QR rastreables | 2 |

**Panel**

| Menú | Ruta | Pantallas | Fase |
| --- | --- | --- | --- |
| Dashboard | `/admin` | Indicadores, alertas, filtros por fecha, sede, programa, responsable y fuente | 1A |
| Control de plazas | `/admin/plazas` | Tabla operativa con semáforo; vistas por responsable, programa y sucursal | 1A |
|  | `/admin/plazas/nueva` | Requerimiento | 1A |
|  | `/admin/plazas/[id]` | Pestañas: Resumen · Publicación · Precalificación · Promoción · Candidatos · Historial | 1A/1B |
| Candidatos | `/admin/candidatos`, `/[id]` | Lista y ficha | 1B |
| Pipeline | `/admin/pipeline?vacante=` | Kanban por vacante | 1B |
| Ingresos | `/admin/ingresos`, `/[id]` | Contrataciones, expediente, visitas, prueba, bajas | 1C |
| Agenda y tareas | `/admin/agenda`, `/admin/tareas` | Calendario del equipo, seguimiento, metas | 1C |
| Aliados | `/admin/aliados` | Directorio de promoción | 1A |
| Contenido | `/admin/contenido/[bloque]` | Editor por bloque con vista previa | 1C |
| Reportes | `/admin/reportes/[reporte]` | Plazas por mes, tiempos, embudo, retención, exportación XLSX | 1A/1B |
| Campañas, Diseños, Conversaciones | `/admin/campanas`… | Ocultos hasta su fase | 2/3 |
| Usuarios, Configuración | `/admin/usuarios`, `/admin/configuracion/[catalogo]` | Usuarios, catálogos, feriados, umbrales | 1A |

El menú lateral solo muestra lo que el rol puede abrir; cada ruta vuelve a verificar el permiso en el servidor.

## Design system

El design system conserva la identidad del prototipo (azules FUNDAP, Montserrat, radios generosos) y corrige tres colores que no pasaban contraste AA para texto. Los tokens viven en `src/app/globals.css` como tema de Tailwind CSS v4.

| Token | Valor | Uso | Contraste sobre blanco |
| --- | --- | --- | --- |
| `brand-600` | #2e6fa7 | Botón primario, enlaces | 5.3:1 |
| `brand-900` | #123a60 | Hero, footer, menú lateral del panel | 11.7:1 |
| `brand-400` | #58b8df | Bordes, foco, decoración; nunca texto sobre blanco | 2.3:1 |
| `brand-50` | #edf8fd | Fondos de pills y secciones suaves | — |
| `ink` | #0d2235 | Texto principal | 16.2:1 |
| `muted` | #617386 | Texto secundario | 4.9:1 |
| `line` | #dce7ef | Bordes y divisores | — |
| `success` | #176f52 (antes #1b8d67, 4.2:1) | En tiempo, aprobado, contratado | 6.1:1 |
| `warning` | #a5610f (antes #ca7a1d, 3.3:1) | Por vencer, pendiente | 4.9:1 |
| `danger` | #b42318 (nuevo) | Vencido, no favorable, baja | 6.6:1 |

Tipografía y forma:

- Montserrat 400/500/600/700 cargada con `next/font` (sin bloqueo de render); escala de títulos con `clamp()` como en el prototipo.
- Radios: 13 px botones e inputs, 18 px tarjetas pequeñas, 22 px tarjetas de vacante, 30 px bloques destacados.
- Dos sombras (`shadow-sm`, `shadow-md`); el panel usa sombras mínimas y bordes para ganar densidad.
- El portal es aireado (secciones de 84 px, 58 px en móvil); el panel es denso (tablas de 40 px por fila).

Accesibilidad mínima obligatoria:

- Foco visible de 3 px en `brand-400` en todos los elementos interactivos.
- Etiquetas asociadas a cada campo, errores anunciados con `aria-live` y vinculados con `aria-describedby`.
- Diálogos con foco atrapado, cierre con Esc y título enlazado (base Radix).
- El estado nunca se comunica solo con color: cada badge lleva texto ("Vencido · 34 d").
- Respeto a `prefers-reduced-motion`.
- Objetivos táctiles de 44 px en móvil.

Imágenes: el hero y las imágenes de vacante se sirven con `next/image` en AVIF/WebP y varios tamaños; se elimina la imagen base64 de 480 KB del prototipo.

## Componentes principales

Tres capas de componentes: base (design system), portal y panel; los de portal y panel solo componen la base y nunca llaman directamente a la base de datos.

| Capa | Componente | Origen en el prototipo | Notas |
| --- | --- | --- | --- |
| Base | `Button` (primary, secondary, ghost, danger) | `.btn-*` | Estados de carga y deshabilitado |
| Base | `Badge` | `.pill` | Variantes por estado, categoría de etapa y prioridad |
| Base | `Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `FileInput` | Formulario de aplicación | Etiqueta, ayuda y error integrados |
| Base | `Dialog`, `Sheet`, `Toast`, `EmptyState`, `Tabs` | Modales, toast | Radix por debajo |
| Portal | `SiteHeader`, `MobileNav`, `SiteFooter` | Navbar y footer | "Mi candidatura" visible también en móvil |
| Portal | `Hero`, `SearchCard` | Hero y tarjeta flotante | Contenido desde CMS |
| Portal | `SectionHeader`, `ValueCards`, `ProcessSteps`, `TrustStrip`, `FaqAccordion` | Secciones del home | Contenido desde CMS |
| Portal | `JobFilters`, `JobCard`, `JobList` | Listado | Filtros sincronizados con la URL |
| Portal | `JobDetail`, `StickyApplyBar`, `ShareButton` | Modal de detalle | Comparte la URL real |
| Portal | `ApplyWizard` (Contacto · Precalificación · CV y consentimiento) | Formulario de aplicación | Progreso guardado en el paso; validación por paso |
| Portal | `StatusLookup`, `StatusTimeline` | Mi candidatura | Etiquetas públicas |
| Portal | `MatchWizard`, `TalentSignup` | Match y comunidad | Sin porcentajes inventados |
| Panel | `AdminShell`, `SideNav`, `PageHeader`, `FilterBar` | Nuevo | Menú según permisos |
| Panel | `DataTable` | Nuevo | Orden, filtros, selección múltiple, exportación |
| Panel | `AgingBadge` | Semáforo del Excel | "En tiempo · 12 d" / "Por vencer" / "Vencido · 34 d" |
| Panel | `VacancyForm`, `ScreeningQuestionsEditor`, `PromotionChecklist` | Hoja Distribución | Requerimiento y publicación en pestañas |
| Panel | `KanbanBoard`, `ApplicationCard`, `MoveStageDialog` | Nuevo | Arrastrar y también botón (accesible por teclado) |
| Panel | `CandidateProfile`, `ActivityTimeline`, `NotesPanel`, `CvViewer` | `StatusTimeline` | Historial unificado de etapas, notas y entrevistas |
| Panel | `HireRecord`, `OnboardingChecklist`, `HomeVisitForm`, `ProbationCard` | Hojas VISTAS DOM y semana de prueba | Bajo permiso de expediente |
| Panel | `KpiCard`, `TrendChart`, `FunnelChart`, `BreakdownTable` | Hojas Gráficas y KPIS | Recharts; cada gráfico con tabla accesible |
| Panel | `TeamCalendar`, `TaskList`, `GoalProgress` | CALENDARIO y Seguimiento | Vista semanal y mensual |
| Panel | `ContentEditor`, `ContentPreview` | Nuevo | Formulario por tipo de bloque, no editor libre |

## Plan de MVP y migración

Cada fase termina con algo que el equipo usa en producción; la Fase 1A está lista cuando RR. HH. deja de actualizar el Excel.

| Fase | Entrega | Criterio de salida |
| --- | --- | --- |
| 1A · Control de plazas | Autenticación y roles, catálogos, requerimientos y vacantes con estados, prioridad, visibilidad y semáforo, promoción y aliados, dashboard, reportes de plazas y tiempos, importación del Excel | Una semana completa de operación sin el Excel; totales cuadran con la última versión |
| 1B · Portal + candidatos | Portal público, aplicación en 3 pasos con CV, atribución, candidatos, pipeline Kanban, entrevistas, Mi candidatura, correos | Aplicaciones reales recibidas y movidas por el pipeline; la bolsa actual redirige al portal |
| 1C · Ingresos y operación | Expediente, verificaciones, visitas, semana de prueba, bajas, agenda, tareas, metas, CMS, base de talento, Match | Expedientes y visitas de nuevos ingresos registrados solo en el sistema |
| 2 · Recruitment marketing | Campañas, enlaces cortos y QR, embudo con costos, diseños por plantilla, automatizaciones | Costo por aplicación y por contratación calculado por campaña |
| 3 · Conversaciones e IA | WhatsApp, Messenger, Instagram, asistente de IA con escalamiento humano, sincronización con Meta Ads | Conversaciones ligadas a candidato y vacante |

Orden de construcción dentro de 1A:

1. Proyecto base: Next.js, Prisma, autenticación, `authorize()`, auditoría, `AdminShell`.
2. Catálogos y semilla: programas, sucursales, departamentos y municipios (INE), feriados 2026–2027, etapas, canales, escala de visitas.
3. Requerimientos y vacantes: formulario, estados, historial, tabla de Control de plazas con semáforo.
4. Promoción y aliados.
5. Dashboard y reportes (plazas abiertas, por mes, tiempos, por responsable, programa y sucursal) con exportación XLSX.
6. Importación del Excel y periodo de operación en paralelo.

Migración del Excel:

1. Normalizar catálogos: unificar valores con espacios o variantes ("Microcrédito ", "USA ", "Microcréditos") y nombres de sucursal.
2. Importar plazas abiertas de la hoja de distribución: sucursal, puesto, programa, responsable, fecha de requerimiento, posiciones, observaciones, canales marcados con X como registros de promoción.
3. Importar el directorio de contactos como aliados.
4. Cargar el histórico 2026 de plazas por mes como serie agregada para que el reporte anual no empiece vacío.
5. Visitas y expedientes: importar solo columnas estructuradas (contrato, seguro, sistema, informes, fecha, modalidad, responsables, clasificación). Las observaciones libres se revisan con RR. HH. antes de decidir si se migran.
6. Validar con RR. HH.: totales por programa, sucursal y responsable contra el Excel; corregir y repetir.
7. Operar una semana en paralelo y congelar el Excel en solo lectura.

## Decisiones pendientes

Solo las dos primeras bloquean el inicio de la Fase 1A; el resto puede resolverse en paralelo.

- [ ] Proveedor de inicio de sesión: Google Workspace o Microsoft 365 (bloquea 1A).
- [ ] Hospedaje de la base de datos: servicio gestionado (Neon/Supabase) o RDS en la cuenta AWS de FUNDAP (bloquea 1A).
- [ ] "Plazas por mes" en el Excel: ¿cuenta requerimientos o posiciones? Define cómo se calcula el reporte anual.
- [ ] Alcance por sede para asesores de talento: ¿ven todas las plazas o solo las de sus sucursales?
- [ ] Umbrales del semáforo: confirmar "por vencer" a 5 días hábiles del límite de la prioridad.
- [ ] Días hábiles: ¿algún equipo trabaja sábados y debe contarlos?
- [ ] Dominio del portal (por ejemplo `empleos.fundap.com.gt`) y redirección desde la bolsa actual.
- [ ] Publicación de información salarial y obligatoriedad del CV por defecto.
- [ ] Política de retención de datos de candidatos y de expedientes (GTH).
- [ ] Texto del consentimiento de tratamiento de datos y caso de postulantes menores de edad en Alumni.
- [ ] Destino de las observaciones libres de visitas ya registradas en el Excel.
- [ ] Calendario de carros: tipo de evento en la agenda o fuera del alcance.
- [ ] Volumen esperado de vacantes y aplicaciones por mes, para dimensionar planes de base de datos y correo.
