import { createClient as createServerSupabase, getUser } from '../../../lib/supabase-server';

export async function POST() {
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) {
    return Response.json({ error: 'Admin login required.' }, { status: 401 });
  }

  try {
    await serverSupabase.from('pending_matches').delete().not('id', 'is', null);
    await serverSupabase.from('trophies').delete().not('id', 'is', null);
    await serverSupabase.from('season_archives').delete().not('id', 'is', null);
    await serverSupabase.from('matches').delete().not('id', 'is', null);
    await serverSupabase.from('players').delete().not('id', 'is', null);
    await serverSupabase.from('seasons').delete().not('id', 'is', null);

    const { error: seedError } = await serverSupabase
      .from('seasons')
      .insert({ name: 'Season 1' });

    if (seedError) throw seedError;

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message || 'Reset failed.' }, { status: 500 });
  }
}
