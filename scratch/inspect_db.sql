
-- Check RLS Policies
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('batches', 'sales', 'expenses', 'inventory', 'insert_logs', 'delete_logs', 'audit_logs', 'sessions');

-- Check Triggers
SELECT event_object_table, trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('batches', 'sales', 'expenses', 'inventory');

-- Check Functions
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_name IN ('log_new_insertion', 'log_deletion');
