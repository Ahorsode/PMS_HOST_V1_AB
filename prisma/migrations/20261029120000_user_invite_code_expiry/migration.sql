-- One-time invite codes replace the shared first-login password (SEC-02).
-- Nullable and additive: existing rows are unaffected.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_code_expires_at" TIMESTAMP(3);
