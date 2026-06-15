import { createServerSupabaseClient } from '../../../../lib/supabase-server';

export async function DELETE(req, { params }) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('trophies').delete().eq('id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
