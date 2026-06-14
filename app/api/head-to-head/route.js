import { supabase } from '../../../lib/supabase';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const a = searchParams.get('a');
  const b = searchParams.get('b');

  if (!a || !b) {
    return Response.json({ error: 'Two players are required.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`and(player_a.eq.${a},player_b.eq.${b}),and(player_a.eq.${b},player_b.eq.${a})`)
    .order('approved_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
