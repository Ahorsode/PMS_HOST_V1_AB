-- Solo/Team plans replace the free Basic plan.
-- Additive columns; existing paying farms become Team plans.
DO $$ BEGIN
  CREATE TYPE "PlanType" AS ENUM ('SOLO', 'TEAM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "plan_type" "PlanType" NOT NULL DEFAULT 'TEAM';
ALTER TABLE "farm_members" ADD COLUMN IF NOT EXISTS "access_paused_at" TIMESTAMP(3);

-- There is no free plan any more: farms without a paid plan or a running
-- trial get a fresh 30-day trial from today so nobody is locked out on deploy.
UPDATE "farms"
SET "master_license_status" = 'CLOUD_TRIAL',
    "trial_started_at" = COALESCE("trial_started_at", now()),
    "trial_expires_at" = now() + INTERVAL '30 days',
    "trial_exhausted_at" = NULL
WHERE "subscriptionTier" = 'BASIC'
  AND COALESCE("master_license_status", '') <> 'REVOKED'
  AND ("trial_expires_at" IS NULL OR "trial_expires_at" < now());
