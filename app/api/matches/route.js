import { supabase } from '../../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('approved_at', { ascending: false })
    .limit(200);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
