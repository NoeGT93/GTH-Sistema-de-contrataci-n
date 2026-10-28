-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'HR_COORDINATOR', 'TALENT_ADVISOR', 'MARKETING', 'EDITOR', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('PENDING_APPROVAL', 'DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'INTERNAL', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE', 'FIELD');

-- CreateEnum
CREATE TYPE "StageCategory" AS ENUM ('ACTIVE', 'HIRED', 'CLOSED_NEGATIVE', 'TALENT_POOL');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('YES_NO', 'SINGLE_CHOICE', 'TEXT', 'NUMBER');

-- CreateEnum
CREATE TYPE "TouchType" AS ENUM ('FIRST', 'LAST');

-- CreateEnum
CREATE TYPE "InterviewKind" AS ENUM ('HR', 'MANAGEMENT', 'FINAL');

-- CreateEnum
CREATE TYPE "InterviewResult" AS ENUM ('PENDING', 'FAVORABLE', 'NOT_FAVORABLE', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "HireStatus" AS ENUM ('ACTIVE', 'SEPARATED');

-- CreateEnum
CREATE TYPE "SeparationType" AS ENUM ('RESIGNATION', 'DISMISSAL', 'CONTRACT_END', 'FAILED_PROBATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ProbationResult" AS ENUM ('PENDING', 'APPROVED', 'NOT_APPROVED');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PENDING', 'DONE', 'NOT_APPLICABLE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitMode" AS ENUM ('IN_PERSON', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "CheckResult" AS ENUM ('PENDING', 'FAVORABLE', 'NOT_FAVORABLE', 'UNREACHABLE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('CV', 'HIRE_DOCUMENT', 'PROMOTION_EVIDENCE', 'VACANCY_IMAGE', 'CMS_IMAGE', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "municipalityId" TEXT,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "geo_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_municipalities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "geo_municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicLabel" TEXT NOT NULL,
    "category" "StageCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "requiresReason" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_channels" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "promotion_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_ratings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "visit_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "onboarding_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "status" "VacancyStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "visibility" "Visibility" NOT NULL DEFAULT 'UNPUBLISHED',
    "priority" "Priority" NOT NULL DEFAULT 'B',
    "modality" "Modality" NOT NULL DEFAULT 'ONSITE',
    "programId" TEXT NOT NULL,
    "areaId" TEXT,
    "ownerId" TEXT,
    "requestedById" TEXT,
    "positions" INTEGER NOT NULL DEFAULT 1,
    "requestedAt" DATE NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "closesAt" DATE,
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "archivedAt" TIMESTAMP(3),
    "summary" TEXT,
    "description" TEXT,
    "requirements" TEXT,
    "benefits" TEXT,
    "salaryText" TEXT,
    "cvRequired" BOOLEAN NOT NULL DEFAULT true,
    "observations" TEXT,
    "imageFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_branches" (
    "vacancyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "positions" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "vacancy_branches_pkey" PRIMARY KEY ("vacancyId","branchId")
);

-- CreateTable
CREATE TABLE "vacancy_status_events" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "fromStatus" "VacancyStatus",
    "toStatus" "VacancyStatus" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacancy_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_questions" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "options" JSONB,
    "expectedAnswer" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "screening_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_promotions" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "partnerId" TEXT,
    "promotedAt" DATE NOT NULL,
    "responsibleId" TEXT,
    "costGtq" DECIMAL(10,2),
    "url" TEXT,
    "evidenceFileId" TEXT,
    "notes" TEXT,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacancy_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_contacts" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "partner_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "municipalityId" TEXT,
    "inTalentPool" BOOLEAN NOT NULL DEFAULT false,
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_interests" (
    "candidateId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,

    CONSTRAINT "candidate_interests_pkey" PRIMARY KEY ("candidateId","areaId")
);

-- CreateTable
CREATE TABLE "consent_versions" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "consentVersionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_tags" (
    "candidateId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "candidate_tags_pkey" PRIMARY KEY ("candidateId","tagId")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "trackingCode" TEXT NOT NULL,
    "cvFileId" TEXT,
    "motivation" TEXT,
    "source" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "closedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_answers" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "mismatch" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "application_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_stage_events" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_stage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribution_touches" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "TouchType" NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "referrer" TEXT,
    "landingPath" TEXT,
    "externalIds" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribution_touches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" "InterviewKind" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "result" "InterviewResult" NOT NULL DEFAULT 'PENDING',
    "resultNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_participants" (
    "interviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "interview_participants_pkey" PRIMARY KEY ("interviewId","userId")
);

-- CreateTable
CREATE TABLE "hires" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "status" "HireStatus" NOT NULL DEFAULT 'ACTIVE',
    "hiredAt" DATE NOT NULL,
    "startDate" DATE,
    "probationResult" "ProbationResult" NOT NULL DEFAULT 'PENDING',
    "probationNotes" TEXT,
    "separatedAt" DATE,
    "separationType" "SeparationType",
    "separationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hire_checklist_items" (
    "id" TEXT NOT NULL,
    "hireId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "doneAt" DATE,
    "fileId" TEXT,
    "notes" TEXT,

    CONSTRAINT "hire_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_visits" (
    "id" TEXT NOT NULL,
    "hireId" TEXT NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "visitedAt" DATE,
    "mode" "VisitMode",
    "ratingId" TEXT,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_visit_visitors" (
    "visitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "home_visit_visitors_pkey" PRIMARY KEY ("visitId","userId")
);

-- CreateTable
CREATE TABLE "background_checks" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "referenceName" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT,
    "result" "CheckResult" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "checkedById" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "background_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE',
    "assigneeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_event_attendees" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "team_event_attendees_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT,
    "metric" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "target" INTEGER NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "kind" "FileKind" NOT NULL,
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_blocks" (
    "key" TEXT NOT NULL,
    "draft" JSONB,
    "published" JSONB,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL,
    "blockKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "programs_name_key" ON "programs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "areas_name_key" ON "areas"("name");

-- CreateIndex
CREATE UNIQUE INDEX "areas_slug_key" ON "areas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");

-- CreateIndex
CREATE UNIQUE INDEX "geo_departments_name_key" ON "geo_departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "geo_municipalities_departmentId_name_key" ON "geo_municipalities"("departmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_key_key" ON "pipeline_stages"("key");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_channels_key_key" ON "promotion_channels"("key");

-- CreateIndex
CREATE UNIQUE INDEX "visit_ratings_name_key" ON "visit_ratings"("name");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_items_name_key" ON "onboarding_items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vacancies_slug_key" ON "vacancies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vacancies_imageFileId_key" ON "vacancies"("imageFileId");

-- CreateIndex
CREATE INDEX "vacancies_status_visibility_idx" ON "vacancies"("status", "visibility");

-- CreateIndex
CREATE INDEX "vacancies_ownerId_idx" ON "vacancies"("ownerId");

-- CreateIndex
CREATE INDEX "vacancy_status_events_vacancyId_createdAt_idx" ON "vacancy_status_events"("vacancyId", "createdAt");

-- CreateIndex
CREATE INDEX "vacancy_promotions_vacancyId_idx" ON "vacancy_promotions"("vacancyId");

-- CreateIndex
CREATE UNIQUE INDEX "partners_name_key" ON "partners"("name");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_phone_key" ON "candidates"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE UNIQUE INDEX "consent_versions_purpose_version_key" ON "consent_versions"("purpose", "version");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "notes_candidateId_idx" ON "notes"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_trackingCode_key" ON "applications"("trackingCode");

-- CreateIndex
CREATE UNIQUE INDEX "applications_cvFileId_key" ON "applications"("cvFileId");

-- CreateIndex
CREATE INDEX "applications_vacancyId_stageId_idx" ON "applications"("vacancyId", "stageId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidateId_vacancyId_key" ON "applications"("candidateId", "vacancyId");

-- CreateIndex
CREATE UNIQUE INDEX "application_answers_applicationId_questionId_key" ON "application_answers"("applicationId", "questionId");

-- CreateIndex
CREATE INDEX "application_stage_events_applicationId_createdAt_idx" ON "application_stage_events"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "application_stage_events_toStageId_createdAt_idx" ON "application_stage_events"("toStageId", "createdAt");

-- CreateIndex
CREATE INDEX "attribution_touches_utmCampaign_idx" ON "attribution_touches"("utmCampaign");

-- CreateIndex
CREATE UNIQUE INDEX "attribution_touches_applicationId_type_key" ON "attribution_touches"("applicationId", "type");

-- CreateIndex
CREATE INDEX "interviews_scheduledAt_idx" ON "interviews"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "hires_applicationId_key" ON "hires"("applicationId");

-- CreateIndex
CREATE INDEX "hires_vacancyId_idx" ON "hires"("vacancyId");

-- CreateIndex
CREATE UNIQUE INDEX "hire_checklist_items_hireId_itemId_key" ON "hire_checklist_items"("hireId", "itemId");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_status_idx" ON "tasks"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "team_events_startsAt_idx" ON "team_events"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "goals_userId_metric_weekStart_key" ON "goals"("userId", "metric", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "files_storageKey_key" ON "files"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_blockKey_version_key" ON "content_versions"("blockKey", "version");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "geo_municipalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_municipalities" ADD CONSTRAINT "geo_municipalities_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "geo_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_imageFileId_fkey" FOREIGN KEY ("imageFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_branches" ADD CONSTRAINT "vacancy_branches_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_branches" ADD CONSTRAINT "vacancy_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_status_events" ADD CONSTRAINT "vacancy_status_events_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_status_events" ADD CONSTRAINT "vacancy_status_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_questions" ADD CONSTRAINT "screening_questions_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_promotions" ADD CONSTRAINT "vacancy_promotions_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_promotions" ADD CONSTRAINT "vacancy_promotions_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "promotion_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_promotions" ADD CONSTRAINT "vacancy_promotions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_promotions" ADD CONSTRAINT "vacancy_promotions_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_promotions" ADD CONSTRAINT "vacancy_promotions_evidenceFileId_fkey" FOREIGN KEY ("evidenceFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "geo_municipalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_interests" ADD CONSTRAINT "candidate_interests_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_interests" ADD CONSTRAINT "candidate_interests_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "consent_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_tags" ADD CONSTRAINT "candidate_tags_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_tags" ADD CONSTRAINT "candidate_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_cvFileId_fkey" FOREIGN KEY ("cvFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "screening_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_events" ADD CONSTRAINT "application_stage_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_events" ADD CONSTRAINT "application_stage_events_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_events" ADD CONSTRAINT "application_stage_events_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_events" ADD CONSTRAINT "application_stage_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribution_touches" ADD CONSTRAINT "attribution_touches_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_participants" ADD CONSTRAINT "interview_participants_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_participants" ADD CONSTRAINT "interview_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hires" ADD CONSTRAINT "hires_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hires" ADD CONSTRAINT "hires_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hire_checklist_items" ADD CONSTRAINT "hire_checklist_items_hireId_fkey" FOREIGN KEY ("hireId") REFERENCES "hires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hire_checklist_items" ADD CONSTRAINT "hire_checklist_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "onboarding_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hire_checklist_items" ADD CONSTRAINT "hire_checklist_items_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visits" ADD CONSTRAINT "home_visits_hireId_fkey" FOREIGN KEY ("hireId") REFERENCES "hires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visits" ADD CONSTRAINT "home_visits_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "visit_ratings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visit_visitors" ADD CONSTRAINT "home_visit_visitors_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "home_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visit_visitors" ADD CONSTRAINT "home_visit_visitors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_checks" ADD CONSTRAINT "background_checks_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_checks" ADD CONSTRAINT "background_checks_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_event_attendees" ADD CONSTRAINT "team_event_attendees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "team_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_event_attendees" ADD CONSTRAINT "team_event_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_blockKey_fkey" FOREIGN KEY ("blockKey") REFERENCES "content_blocks"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
