import 'server-only'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseWriteKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseWriteKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseWriteKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
