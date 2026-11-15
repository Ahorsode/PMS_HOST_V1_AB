-- Admin console: farm support notes, messages to farms, tracked admin sessions, two-step
-- sign-in fields, and conversion of old-style subscriptions.

CREATE TABLE IF NOT EXISTS "farm_notes" (
  "id" TEXT NOT NULL,
  "farm_id" TEXT NOT NULL,
  "admin_username" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "farm_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "farm_notes_farm_id_created_at_idx" ON "farm_notes"("farm_id", "created_at");
DO $$ BEGIN
  ALTER TABLE "farm_notes" ADD CONSTRAINT "farm_notes_farm_id_fkey"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "farm_messages" (
  "id" TEXT NOT NULL,
  "farm_id" TEXT,
  "audience" TEXT NOT NULL DEFAULT 'OWNERS',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "tone" TEXT NOT NULL DEFAULT 'info',
  "show_until" TIMESTAMP(3),
  "withdrawn_at" TIMESTAMP(3),
  "admin_username" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "farm_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "farm_messages_farm_id_created_at_idx" ON "farm_messages"("farm_id", "created_at");
DO $$ BEGIN
  ALTER TABLE "farm_messages" ADD CONSTRAINT "farm_messages_farm_id_fkey"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "admin_sessions" (
  "id" TEXT NOT NULL,
  "admin_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "user_agent" TEXT,
  "ip" TEXT,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "admin_sessions_admin_user_id_created_at_idx" ON "admin_sessions"("admin_user_id", "created_at");
DO $$ BEGIN
  ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "totp_secret" TEXT;
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "totp_enabled_at" TIMESTAMP(3);

-- Old-style subscriptions (subscriptions + subscription_plans) are no longer
-- read by the app. Copy each still-active one onto its farm so the farm keeps
-- exactly the access it had: the same tier, until the same end date (or with
-- no end date, a grant that does not lapse). Farms already on a paid plan of
-- their own are left alone. The old tables are kept, unused.
-- Skipped when either old table is absent (they were created outside the
-- migration history on some databases), so the deploy never fails on it.
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL AND to_regclass('public.subscription_plans') IS NOT NULL THEN
    UPDATE "farms" f
    SET "subscriptionTier" = p."tier",
        "master_license_status" = CASE WHEN s."endDate" IS NULL THEN 'PAID_AND_ACTIVE' ELSE 'PAID_' || p."tier"::text END,
        "trial_expires_at" = COALESCE(s."endDate", f."trial_expires_at"),
        "trial_exhausted_at" = NULL
    FROM "subscriptions" s
    JOIN "subscription_plans" p ON p."id" = s."planId"
    WHERE s."farmId" = f."id"
      AND s."status" = 'ACTIVE'
      AND (s."endDate" IS NULL OR s."endDate" > now())
      AND p."tier" <> 'BASIC'
      AND f."subscriptionTier" = 'BASIC';
  END IF;
END $$;
