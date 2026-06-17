import { createClient as createServerSupabase, getUser } from '../../../lib/supabase-server';

export async function POST() {
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) {
    return Response.json({ error: 'Admin login required.' }, { status: 401 });
  }

  try {
    const { error: e1 } = await serverSupabase.from('pending_matches').delete().not('id', 'is', null);
    if (e1) throw new Error('Failed clearing pending matches: ' + e1.message);

    const { error: e2 } = await serverSupabase.from('trophies').delete().not('id', 'is', null);
    if (e2) throw new Error('Failed clearing trophies: ' + e2.message);

    const { error: e3 } = await serverSupabase.from('season_archives').delete().not('id', 'is', null);
    if (e3) throw new Error('Failed clearing season archives: ' + e3.message);

    const { error: e4 } = await serverSupabase.from('matches').delete().not('id', 'is', null);
    if (e4) throw new Error('Failed clearing matches: ' + e4.message);

    const { error: e5 } = await serverSupabase.from('players').delete().not('id', 'is', null);
    if (e5) throw new Error('Failed clearing players: ' + e5.message);

    const { error: e6 } = await serverSupabase.from('seasons').delete().not('id', 'is', null);
    if (e6) throw new Error('Failed clearing seasons: ' + e6.message);

    const { error: e7 } = await serverSupabase.from('seasons').insert({ name: 'Season 1' });
    if (e7) throw new Error('Failed creating new season: ' + e7.message);

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message || 'Reset failed.' }, { status: 500 });
  }
}
