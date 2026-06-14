import { supabase } from '../../../../lib/supabase';
import { createClient as createServerSupabase, getUser } from '../../../../lib/supabase-server';
import { START_ELO } from '../../../../lib/config';

export async function POST(req) {
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) {
    return Response.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const nextName = (body.name || '').trim();

  const { data: current, error: currentError } = await supabase
    .from('seasons')
    .select('*')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentError) return Response.json({ error: currentError.message }, { status: 500 });
  if (!current) return Response.json({ error: 'No active season found.' }, { status: 400 });

  const { data: players, error: playersError } = await supabase.from('players').select('*');
  if (playersError) return Response.json({ error: playersError.message }, { status: 500 });

  // Archive current standings
  if (players.length > 0) {
    const archiveRows = players.map((p) => ({
      season_id: current.id,
      player_id: p.id,
      player_name: p.name,
      elo: p.elo,
      wins: p.wins,
      draws: p.draws,
      losses: p.losses,
    }));

    const { error: archiveError } = await serverSupabase.from('season_archives').insert(archiveRows);
    if (archiveError) return Response.json({ error: archiveError.message }, { status: 500 });
  }

  // Close current season
  const { error: closeError } = await serverSupabase
    .from('seasons')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', current.id);
  if (closeError) return Response.json({ error: closeError.message }, { status: 500 });

  // Start new season
  const newSeasonName = nextName || `Season ${(await countSeasons()) + 1}`;
  const { data: newSeason, error: newSeasonError } = await serverSupabase
    .from('seasons')
    .insert({ name: newSeasonName })
    .select()
    .single();
  if (newSeasonError) return Response.json({ error: newSeasonError.message }, { status: 500 });

  // Reset every player's rating and record for the new season
  const { error: resetError } = await serverSupabase
    .from('players')
    .update({ elo: START_ELO, wins: 0, draws: 0, losses: 0 })
    .not('id', 'is', null); // matches all rows

  if (resetError) return Response.json({ error: resetError.message }, { status: 500 });

  // Clear any outstanding pending results from the old season
  await serverSupabase.from('pending_matches').delete().not('id', 'is', null);

  return Response.json({ success: true, newSeason });
}

async function countSeasons() {
  const { count } = await supabase.from('seasons').select('id', { count: 'exact', head: true });
  return count || 0;
}
