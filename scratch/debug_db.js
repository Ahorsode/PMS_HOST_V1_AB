
const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const tables = ['batches', 'sales', 'expenses', 'inventory', 'insert_logs', 'delete_logs', 'audit_logs', 'sessions'];

    console.log('\n--- RLS Policies ---');
    const rlsRes = await client.query(`
      SELECT tablename, policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = ANY($1)
    `, [tables]);
    console.table(rlsRes.rows);

    console.log('\n--- Triggers ---');
    const triggerRes = await client.query(`
      SELECT event_object_table, trigger_name, event_manipulation, action_statement, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = ANY($1)
    `, [['batches', 'sales', 'expenses', 'inventory']]);
    console.table(triggerRes.rows);

    console.log('\n--- Functions ---');
    const funcRes = await client.query(`
      SELECT routine_name, routine_type, security_type
      FROM information_schema.routines
      WHERE routine_name IN ('log_new_insertion', 'log_deletion')
    `);
    console.table(funcRes.rows);

    console.log('\n--- Table Structure (batches) ---');
    const structRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'batches'
    `);
    console.table(structRes.rows);

    console.log('\n--- Table Structure (sessions) ---');
    const sessionRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sessions'
    `);
    console.table(sessionRes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
