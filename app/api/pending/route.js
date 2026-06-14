import { supabase } from '../../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('pending_matches')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { playerA, playerB, scoreA, scoreB, submittedBy, screenshotUrl } = body;

  if (!playerA || !playerB || playerA === playerB) {
    return Response.json({ error: 'Pick two different players.' }, { status: 400 });
  }
  if (
    scoreA === undefined || scoreB === undefined ||
    scoreA === null || scoreB === null ||
    scoreA === '' || scoreB === '' ||
    isNaN(scoreA) || isNaN(scoreB)
  ) {
    return Response.json({ error: 'Enter a final score for both sides.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('pending_matches')
    .insert({
      player_a: playerA,
      player_b: playerB,
      score_a: parseInt(scoreA, 10),
      score_b: parseInt(scoreB, 10),
      submitted_by: (submittedBy || 'Unknown').trim() || 'Unknown',
      screenshot_url: screenshotUrl || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
