import { supabase } from '../../../../../lib/supabase';

// Open to anyone — lets a member set their own team picture and highest rank.
// Roster management (name/elo/delete) stays admin-only via the [id] route.
export async function PUT(req, { params }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const updates = {};

  if (body.teamPictureUrl !== undefined) updates.team_picture_url = body.teamPictureUrl;
  if (body.highestRank !== undefined) updates.highest_rank = String(body.highestRank).trim();

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
