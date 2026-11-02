-- Admin console configuration: settings sections, audit log, admin roles,
-- promo codes and per-farm overrides. Additive only; existing admins keep
-- full access as SUPER_ADMIN and code defaults apply until settings are saved.
CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by_admin_id" TEXT,
  CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "admin_audit_log" (
  "id" TEXT NOT NULL,
  "admin_user_id" TEXT,
  "admin_username" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target_type" TEXT,
  "target_id" TEXT,
  "summary" TEXT NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at");
CREATE INDEX IF NOT EXISTS "admin_audit_log_target_type_target_id_idx" ON "admin_audit_log"("target_type", "target_id");

ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN';

CREATE TABLE IF NOT EXISTS "promo_codes" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "percent_off" INTEGER NOT NULL,
  "plan_types" "PlanType"[] DEFAULT ARRAY[]::"PlanType"[],
  "expires_at" TIMESTAMP(3),
  "max_redemptions" INTEGER,
  "redemptions" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_admin_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_key" ON "promo_codes"("code");

CREATE TABLE IF NOT EXISTS "farm_overrides" (
  "farm_id" TEXT NOT NULL,
  "extra_features" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "override_staff_limit" BOOLEAN NOT NULL DEFAULT false,
  "staff_limit" INTEGER,
  "discount_percent" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by_admin_id" TEXT,
  CONSTRAINT "farm_overrides_pkey" PRIMARY KEY ("farm_id")
);
DO $$ BEGIN
  ALTER TABLE "farm_overrides" ADD CONSTRAINT "farm_overrides_farm_id_fkey"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
