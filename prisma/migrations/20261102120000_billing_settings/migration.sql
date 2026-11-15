-- Admin-editable billing configuration (plan names, prices, features, staff
-- limits, term discounts, desktop license prices). Additive; no row is seeded,
-- so the code defaults apply until an admin saves the Plans & Pricing page.
CREATE TABLE IF NOT EXISTS "billing_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "config" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by_admin_id" TEXT,
  CONSTRAINT "billing_settings_pkey" PRIMARY KEY ("id")
);
