-- Records which Terms/Privacy version each user accepted, when, and how.
-- Additive: existing rows are unaffected.
CREATE TABLE IF NOT EXISTS "legal_acceptances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "legal_acceptances_user_id_document_version_key" ON "legal_acceptances"("user_id", "document", "version");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legal_acceptances_user_id_fkey') THEN
    ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
