import { supabase } from '../../../../lib/supabase';
import { createClient as createServerSupabase, getUser } from '../../../../lib/supabase-server';
import { eloDelta } from '../../../../lib/config';

// Approve a pending match: updates ELO + records, inserts into matches, clears pending
export async function POST(req, { params }) {
  const { id } = params;
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) {
    return Response.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const { data: entry, error: entryError } = await supabase
    .from('pending_matches')
    .select('*')
    .eq('id', id)
    .single();

  if (entryError || !entry) {
    return Response.json({ error: 'That result no longer exists.' }, { status: 404 });
  }

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .in('id', [entry.player_a, entry.player_b]);

  if (playersError || !players || players.length !== 2) {
    return Response.json({ error: 'Could not load both players.' }, { status: 500 });
  }

  const pA = players.find((p) => p.id === entry.player_a);
  const pB = players.find((p) => p.id === entry.player_b);

  let result; // from A's perspective: 1 win, 0.5 draw, 0 loss
  if (entry.score_a > entry.score_b) result = 1;
  else if (entry.score_a < entry.score_b) result = 0;
  else result = 0.5;

  const dA = eloDelta(pA.elo, pB.elo, result);
  const dB = eloDelta(pB.elo, pA.elo, 1 - result);

  const newEloA = pA.elo + dA;
  const newEloB = pB.elo + dB;

  const outcomeA = result === 1 ? 'w' : result === 0 ? 'l' : 'd';
  const outcomeB = result === 1 ? 'l' : result === 0 ? 'w' : 'd';

  // Find current season
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: updateAError } = await serverSupabase
    .from('players')
    .update({
      elo: newEloA,
      wins: pA.wins + (outcomeA === 'w' ? 1 : 0),
      draws: pA.draws + (outcomeA === 'd' ? 1 : 0),
      losses: pA.losses + (outcomeA === 'l' ? 1 : 0),
    })
    .eq('id', pA.id);

  const { error: updateBError } = await serverSupabase
    .from('players')
    .update({
      elo: newEloB,
      wins: pB.wins + (outcomeB === 'w' ? 1 : 0),
      draws: pB.draws + (outcomeB === 'd' ? 1 : 0),
      losses: pB.losses + (outcomeB === 'l' ? 1 : 0),
    })
    .eq('id', pB.id);

  if (updateAError || updateBError) {
    return Response.json({ error: 'Failed to update player ratings.' }, { status: 500 });
  }

  const { error: matchError } = await serverSupabase.from('matches').insert({
    player_a: entry.player_a,
    player_b: entry.player_b,
    score_a: entry.score_a,
    score_b: entry.score_b,
    delta_a: dA,
    delta_b: dB,
    elo_a_after: newEloA,
    elo_b_after: newEloB,
    played_at: entry.created_at,
    screenshot_url: entry.screenshot_url,
    season_id: season?.id || null,
  });

  if (matchError) {
    return Response.json({ error: 'Failed to record the match.' }, { status: 500 });
  }

  await serverSupabase.from('pending_matches').delete().eq('id', id);

  return Response.json({ success: true });
}

// Reject a pending match
export async function DELETE(req, { params }) {
  const { id } = params;
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) {
    return Response.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const { error } = await serverSupabase.from('pending_matches').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
