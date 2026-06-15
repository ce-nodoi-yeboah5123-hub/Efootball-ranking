import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.SUPABASE_URL || 'https://qjogykolbwnxundhjxqr.supabase.co';
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqb2d5a29sYndueHVuZGhqeHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTQ0ODAsImV4cCI6MjA5Njg3MDQ4MH0.OYr74ro3Dse8oT5WxrVi03kGeyRWU4wJDHN4JsGijtk';

// Use inside Route Handlers (app/api/**/route.js). Carries the logged-in
// admin's session via cookies so RLS policies that require `authenticated`
// pass correctly.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll called from a Server Component - safe to ignore,
          // middleware refreshes the session instead.
        }
      },
    },
  });
}

export async function getUser(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}
