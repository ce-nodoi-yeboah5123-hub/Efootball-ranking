import { createClient as createServerSupabase, getUser } from '../../../../lib/supabase-server';

const EDITABLE_FIELDS = ['name', 'elo', 'wins', 'draws', 'losses', 'team_picture_url', 'highest_rank'];

export async function PUT(req, { params }) {
  const { id } = params;
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) {
    return Response.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const updates = {};

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (updates.name !== undefined) {
    updates.name = String(updates.name).trim();
    if (!updates.name) {
      return Response.json({ error: 'Name cannot be empty.' }, { status: 400 });
    }
  }
  for (const numField of ['elo', 'wins', 'draws', 'losses']) {
    if (updates[numField] !== undefined) {
      const n = parseInt(updates[numField], 10);
      if (isNaN(n)) {
        return Response.json({ error: `${numField} must be a number.` }, { status: 400 });
      }
      updates[numField] = n;
    }
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { data, error } = await serverSupabase
    .from('players')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function DELETE(req, { params }) {
  const { id } = params;
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) {
    return Response.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const { error } = await serverSupabase.from('players').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ success: true });
}
