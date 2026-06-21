import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { data: seasons, error } = await supabase
      .from('seasons')
      .select('*')
      .order('started_at', { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const current = seasons.find((s) => !s.ended_at) || null;
    const past = seasons.filter((s) => s.ended_at);

    let archives = [];
    if (past.length > 0) {
      const { data: archiveData, error: archiveError } = await supabase
        .from('season_archives')
        .select('*')
        .in('season_id', past.map((s) => s.id))
        .order('elo', { ascending: false });

      if (!archiveError && archiveData) {
        archives = archiveData;
      }
    }

    return Response.json({ current, past, archives });
  } catch (err) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
