import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vjsrsxkjpeknstxyzpkm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc3JzeGtqcGVrbnN0eHl6cGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTkyODMsImV4cCI6MjA5MDczNTI4M30.GZ5mEKf57-jdtw_1A66b9zladJhH1J9d0k4N7GV_-0k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to call Edge Functions with anon key auth
export async function callFunction(name: string, body: any) {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}
