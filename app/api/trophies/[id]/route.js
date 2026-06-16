import { createClient as createServerSupabase, getUser } from '../../../../lib/supabase-server';

export async function DELETE(req, { params }) {
  const { id } = params;
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) {
    return Response.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const { error } = await serverSupabase.from('trophies').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ success: true });
}
