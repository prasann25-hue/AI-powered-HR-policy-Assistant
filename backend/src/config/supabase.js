const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
}

// Service-role client — bypasses RLS for admin operations (policy ingestion, audit)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { persistSession: false },
  }
);

// Anon client factory — creates a client that RESPECTS RLS using the user's JWT
const createUserClient = (jwt) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
    auth: { persistSession: false },
  });

module.exports = { supabaseAdmin, createUserClient };
