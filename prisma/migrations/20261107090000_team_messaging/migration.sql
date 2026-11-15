-- Team messaging: private conversations between a farm owner and each team member.

CREATE TABLE IF NOT EXISTS "team_conversations" (
  "id" TEXT NOT NULL,
  "farm_id" TEXT NOT NULL,
  "member_user_id" TEXT NOT NULL,
  "last_message_at" TIMESTAMP(3),
  "owner_last_read_at" TIMESTAMP(3),
  "member_last_read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "team_conversations_farm_id_member_user_id_key"
  ON "team_conversations"("farm_id", "member_user_id");
CREATE INDEX IF NOT EXISTS "team_conversations_farm_id_last_message_at_idx"
  ON "team_conversations"("farm_id", "last_message_at");

CREATE TABLE IF NOT EXISTS "team_messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "farm_id" TEXT NOT NULL,
  "sender_user_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "team_messages_conversation_id_created_at_idx"
  ON "team_messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "team_messages_farm_id_idx" ON "team_messages"("farm_id");

DO $$ BEGIN
  ALTER TABLE "team_conversations" ADD CONSTRAINT "team_conversations_farm_id_fkey"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "team_conversations" ADD CONSTRAINT "team_conversations_member_user_id_fkey"
    FOREIGN KEY ("member_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "team_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_farm_id_fkey"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_sender_user_id_fkey"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only the two people in a conversation can see it: the farm owner and that team member.
ALTER TABLE "team_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "team_messages" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_conversations_participant_policy" ON "team_conversations";
CREATE POLICY "team_conversations_participant_policy" ON "team_conversations"
  FOR ALL
  USING (
    "member_user_id" = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM "farms"
      WHERE "farms"."id" = "team_conversations"."farm_id"
        AND "farms"."userId" = current_setting('app.current_user_id', true)
    )
  )
  -- A conversation can only be opened by the owner, or by a member of that farm for themselves.
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "farms"
      WHERE "farms"."id" = "team_conversations"."farm_id"
        AND "farms"."userId" = current_setting('app.current_user_id', true)
    )
    OR (
      "member_user_id" = current_setting('app.current_user_id', true)
      AND EXISTS (
        SELECT 1 FROM "farm_members"
        WHERE "farm_members"."farmId" = "team_conversations"."farm_id"
          AND "farm_members"."userId" = current_setting('app.current_user_id', true)
      )
    )
  );

DROP POLICY IF EXISTS "team_messages_participant_policy" ON "team_messages";
CREATE POLICY "team_messages_participant_policy" ON "team_messages"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "team_conversations" c
      WHERE c."id" = "team_messages"."conversation_id"
        AND (
          c."member_user_id" = current_setting('app.current_user_id', true)
          OR EXISTS (
            SELECT 1 FROM "farms"
            WHERE "farms"."id" = c."farm_id"
              AND "farms"."userId" = current_setting('app.current_user_id', true)
          )
        )
    )
  )
  -- New messages must be sent as the signed-in user.
  WITH CHECK (
    "sender_user_id" = current_setting('app.current_user_id', true)
    AND EXISTS (
      SELECT 1 FROM "team_conversations" c
      WHERE c."id" = "team_messages"."conversation_id"
        AND c."farm_id" = "team_messages"."farm_id"
        AND (
          c."member_user_id" = current_setting('app.current_user_id', true)
          OR EXISTS (
            SELECT 1 FROM "farms"
            WHERE "farms"."id" = c."farm_id"
              AND "farms"."userId" = current_setting('app.current_user_id', true)
          )
        )
    )
  );
