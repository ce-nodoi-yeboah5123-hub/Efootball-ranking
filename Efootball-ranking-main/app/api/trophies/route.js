import { createServerSupabaseClient } from '../../../lib/supabase-server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('trophies')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(req) {
  const supabase = createServerSupabaseClient();
  const body = await req.json();
  const { playerId, competitionName, trophyType, count } = body;
  if (!playerId || !competitionName || !trophyType) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('trophies')
    .insert({ player_id: playerId, competition_name: competitionName, trophy_type: trophyType, count: count || 1 })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
