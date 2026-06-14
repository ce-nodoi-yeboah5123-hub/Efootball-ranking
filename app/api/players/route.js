import { supabase } from '../../../lib/supabase';
import { createClient as createServerSupabase, getUser } from '../../../lib/supabase-server';
import { START_ELO } from '../../../lib/config';

export async function GET() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('elo', { ascending: false });

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
  const name = (body.name || '').trim();

  if (!name) {
    return Response.json({ error: 'Name is required.' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .ilike('name', name)
    .maybeSingle();

  if (existing) {
    return Response.json({ error: 'That name is already on the table.' }, { status: 400 });
  }

  const { data, error } = await serverSupabase
    .from('players')
    .insert({ name, elo: START_ELO })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
