import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting Audit & Logging Migration...')

  const tables = [
    `CREATE TABLE IF NOT EXISTS insert_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        farm_id INT4 NOT NULL,
        target_table TEXT NOT NULL,
        record_id INT4 NOT NULL,
        inserted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS delete_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        farm_id INT4 NOT NULL,
        table_name TEXT NOT NULL,
        deleted_data_csv TEXT NOT NULL,
        deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  const functions = [
    `CREATE OR REPLACE FUNCTION log_insert_fn()
    RETURNS TRIGGER AS $$
    DECLARE
        v_user_id TEXT;
        v_farm_id INT;
    BEGIN
        v_user_id := COALESCE(to_jsonb(NEW)->>'user_id', to_jsonb(NEW)->>'userId', 'system');
        v_farm_id := COALESCE((to_jsonb(NEW)->>'farmId')::int, (to_jsonb(NEW)->>'farm_id')::int, 1);
        
        INSERT INTO insert_logs (user_id, farm_id, target_table, record_id)
        VALUES (v_user_id, v_farm_id, TG_TABLE_NAME, NEW.id);
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`,
    `CREATE OR REPLACE FUNCTION log_delete_fn()
    RETURNS TRIGGER AS $$
    DECLARE
        header TEXT;
        vals TEXT;
        v_user_id TEXT;
        v_farm_id INT;
    BEGIN
        SELECT string_agg(quote_ident(key), '|') INTO header 
        FROM (SELECT key FROM jsonb_each(to_jsonb(OLD)) ORDER BY key) s;
        
        SELECT string_agg(quote_literal(coalesce(value, '')), '|') INTO vals 
        FROM (SELECT value FROM jsonb_each_text(to_jsonb(OLD)) ORDER BY key) s;
        
        v_user_id := COALESCE(to_jsonb(OLD)->>'user_id', to_jsonb(OLD)->>'userId', 'system');
        v_farm_id := COALESCE((to_jsonb(OLD)->>'farmId')::int, (to_jsonb(OLD)->>'farm_id')::int, 1);

        INSERT INTO delete_logs (user_id, farm_id, table_name, deleted_data_csv)
        VALUES (v_user_id, v_farm_id, TG_TABLE_NAME, header || E'\n' || vals);
        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;`
  ];

  const triggers = [
    // Drop existing
    `DROP TRIGGER IF EXISTS tr_log_insert_batches ON batches;`,
    `DROP TRIGGER IF EXISTS tr_log_insert_sales ON sales;`,
    `DROP TRIGGER IF EXISTS tr_log_insert_expenses ON expenses;`,
    `DROP TRIGGER IF EXISTS tr_log_insert_inventory ON inventory;`,
    `DROP TRIGGER IF EXISTS tr_log_insert_feeding ON daily_feeding_logs;`,
    `DROP TRIGGER IF EXISTS tr_log_delete_batches ON batches;`,
    `DROP TRIGGER IF EXISTS tr_log_delete_sales ON sales;`,
    `DROP TRIGGER IF EXISTS tr_log_delete_expenses ON expenses;`,
    `DROP TRIGGER IF EXISTS tr_log_delete_inventory ON inventory;`,
    `DROP TRIGGER IF EXISTS tr_log_delete_feeding ON daily_feeding_logs;`,
    // Create new
    `CREATE TRIGGER tr_log_insert_batches AFTER INSERT ON batches FOR EACH ROW EXECUTE FUNCTION log_insert_fn();`,
    `CREATE TRIGGER tr_log_insert_sales AFTER INSERT ON sales FOR EACH ROW EXECUTE FUNCTION log_insert_fn();`,
    `CREATE TRIGGER tr_log_insert_expenses AFTER INSERT ON expenses FOR EACH ROW EXECUTE FUNCTION log_insert_fn();`,
    `CREATE TRIGGER tr_log_insert_inventory AFTER INSERT ON inventory FOR EACH ROW EXECUTE FUNCTION log_insert_fn();`,
    `CREATE TRIGGER tr_log_insert_feeding AFTER INSERT ON daily_feeding_logs FOR EACH ROW EXECUTE FUNCTION log_insert_fn();`,
    `CREATE TRIGGER tr_log_delete_batches BEFORE DELETE ON batches FOR EACH ROW EXECUTE FUNCTION log_delete_fn();`,
    `CREATE TRIGGER tr_log_delete_sales BEFORE DELETE ON sales FOR EACH ROW EXECUTE FUNCTION log_delete_fn();`,
    `CREATE TRIGGER tr_log_delete_expenses BEFORE DELETE ON expenses FOR EACH ROW EXECUTE FUNCTION log_delete_fn();`,
    `CREATE TRIGGER tr_log_delete_inventory BEFORE DELETE ON inventory FOR EACH ROW EXECUTE FUNCTION log_delete_fn();`,
    `CREATE TRIGGER tr_log_delete_feeding BEFORE DELETE ON daily_feeding_logs FOR EACH ROW EXECUTE FUNCTION log_delete_fn();`
  ];

  try {
    for (const sql of [...tables, ...functions, ...triggers]) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
