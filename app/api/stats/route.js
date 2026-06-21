import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MIN_GAMES_FOR_WIN_RATE = 1;
const EMPTY_PERIOD = { eloLeaders: [], winRateLeaders: [], minGames: MIN_GAMES_FOR_WIN_RATE };

function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6);
  return d.toISOString();
}

function startOfMonth() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.toISOString();
}

function summarizePeriod(matches, playersById) {
  const eloGain = {};
  const games = {};
  const wins = {};

  (matches || []).forEach((m) => {
    if (!m.player_a || !m.player_b) return;
    eloGain[m.player_a] = (eloGain[m.player_a] || 0) + (m.delta_a || 0);
    eloGain[m.player_b] = (eloGain[m.player_b] || 0) + (m.delta_b || 0);

    games[m.player_a] = (games[m.player_a] || 0) + 1;
    games[m.player_b] = (games[m.player_b] || 0) + 1;

    if (m.score_a > m.score_b) wins[m.player_a] = (wins[m.player_a] || 0) + 1;
    else if (m.score_b > m.score_a) wins[m.player_b] = (wins[m.player_b] || 0) + 1;
  });

  const eloLeaders = Object.entries(eloGain)
    .map(([playerId, total]) => ({
      playerId,
      name: playersById[playerId]?.name || 'Unknown',
      eloGain: total,
      games: games[playerId] || 0,
    }))
    .sort((a, b) => b.eloGain - a.eloGain)
    .slice(0, 5);

  const winRateLeaders = Object.entries(games)
    .filter(([, g]) => g >= MIN_GAMES_FOR_WIN_RATE)
    .map(([playerId, g]) => ({
      playerId,
      name: playersById[playerId]?.name || 'Unknown',
      games: g,
      wins: wins[playerId] || 0,
      winRate: (wins[playerId] || 0) / g,
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);

  return { eloLeaders, winRateLeaders, minGames: MIN_GAMES_FOR_WIN_RATE };
}

export async function GET() {
  try {
    const { data: players } = await supabase.from('players').select('id, name');
    const playersById = {};
    (players || []).forEach((p) => (playersById[p.id] = p));

    const { data: weeklyMatches } = await supabase
      .from('matches')
      .select('*')
      .gte('approved_at', startOfWeek());

    const { data: monthlyMatches } = await supabase
      .from('matches')
      .select('*')
      .gte('approved_at', startOfMonth());

    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let seasonMatches = [];
    if (season) {
      const { data } = await supabase.from('matches').select('*').eq('season_id', season.id);
      seasonMatches = data || [];
    }

    const goals = {};
    seasonMatches.forEach((m) => {
      if (!m.player_a || !m.player_b) return;
      goals[m.player_a] = (goals[m.player_a] || 0) + (m.score_a || 0);
      goals[m.player_b] = (goals[m.player_b] || 0) + (m.score_b || 0);
    });

    const topScorers = Object.entries(goals)
      .map(([playerId, total]) => ({
        playerId,
        name: playersById[playerId]?.name || 'Unknown',
        goals: total,
      }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5);

    return Response.json({
      weekly: summarizePeriod(weeklyMatches, playersById),
      monthly: summarizePeriod(monthlyMatches, playersById),
      topScorers,
    });
  } catch (err) {
    console.error('stats route error:', err);
    return Response.json({ weekly: EMPTY_PERIOD, monthly: EMPTY_PERIOD, topScorers: [] });
  }
}
