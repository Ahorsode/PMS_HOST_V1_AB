
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const tables = ['batches', 'sales', 'expenses', 'inventory', 'insert_logs', 'delete_logs', 'audit_logs', 'sessions'];

    console.log('\n--- RLS Policies ---');
    const rlsRes = await prisma.$queryRawUnsafe(`
      SELECT tablename, policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = ANY($1)
    `, tables);
    console.table(rlsRes);

    console.log('\n--- Triggers ---');
    const triggerRes = await prisma.$queryRawUnsafe(`
      SELECT event_object_table, trigger_name, event_manipulation, action_statement, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = ANY($1)
    `, ['batches', 'sales', 'expenses', 'inventory']);
    console.table(triggerRes);

    console.log('\n--- Functions ---');
    const funcRes = await prisma.$queryRawUnsafe(`
      SELECT routine_name, routine_type, security_type
      FROM information_schema.routines
      WHERE routine_name IN ('log_new_insertion', 'log_deletion')
    `);
    console.table(funcRes);

    console.log('\n--- Table Structure (batches) ---');
    const structRes = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'batches'
    `);
    console.table(structRes);

    console.log('\n--- Table Structure (sessions) ---');
    const sessionRes = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sessions'
    `);
    console.table(sessionRes);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect()
  }
}

main()
