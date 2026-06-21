import { supabase } from '../../../lib/supabase';
import { createClient as createServerSupabase, getUser } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { data, error } = await supabase
    .from('trophies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req) {
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) {
    return Response.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { playerId, competitionName, trophyType, count } = body;

  if (!playerId || !competitionName || !trophyType) {
    return Response.json({ error: 'Player, competition name, and trophy type are required.' }, { status: 400 });
  }

  const { data, error } = await serverSupabase
    .from('trophies')
    .insert({
      player_id: playerId,
      competition_name: competitionName.trim(),
      trophy_type: trophyType,
      count: parseInt(count, 10) || 1,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
