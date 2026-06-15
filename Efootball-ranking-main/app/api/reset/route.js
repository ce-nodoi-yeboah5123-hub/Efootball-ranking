import { createServerSupabaseClient } from '../../../lib/supabase-server';

export async function POST() {
  const supabase = createServerSupabaseClient();

  // Delete in order to respect foreign keys
  const steps = [
    supabase.from('trophies').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('pending_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('seasons').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
  ];

  for (const step of steps) {
    const { error } = await step;
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
