'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Swords,
  History,
  Repeat,
  Users,
  Image as ImageIcon,
  Loader2,
  BarChart3,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { uploadScreenshot } from '../lib/supabaseClient';

function FormDots({ form }) {
  const last5 = (form || []).slice(-5).reverse();
  const slots = [...last5, ...Array(5 - last5.length).fill(null)];
  return (
    <div className="flex gap-1 mt-1">
      {slots.map((r, i) => {
        let bg = 'rgba(244,241,232,0.08)';
        if (r === 'W') bg = '#9FE870';
        if (r === 'D') bg = '#E8C468';
        if (r === 'L') bg = '#FF6B5B';
        return <div key={i} className="w-2 h-2 rounded-sm" style={{ background: bg }} />;
      })}
    </div>
  );
}

export default function Home() {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [pending, setPending] = useState([]);
  const [season, setSeason] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('leaderboard');
  const [busy, setBusy] = useState(false);

  // submit match
  const [matchA, setMatchA] = useState('');
  const [matchB, setMatchB] = useState('');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [matchError, setMatchError] = useState('');
  const [submitOk, setSubmitOk] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  // head to head
  const [h2hA, setH2hA] = useState('');
  const [h2hB, setH2hB] = useState('');
  const [h2hMatches, setH2hMatches] = useState(null);
  const [h2hLoading, setH2hLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [playersRes, matchesRes, pendingRes, seasonRes, statsRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/matches'),
        fetch('/api/pending'),
        fetch('/api/season'),
        fetch('/api/stats'),
      ]);
      setPlayers(await playersRes.json());
      setMatches(await matchesRes.json());
      setPending(await pendingRes.json());
      setSeason(await seasonRes.json());
      setStats(await statsRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const playerById = useMemo(() => {
    const map = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  function playerName(id) {
    return playerById[id]?.name || 'Unknown';
  }

  // compute last-5 form per player from match history
  const formByPlayer = useMemo(() => {
    const map = {};
    players.forEach((p) => (map[p.id] = []));
    const chronological = [...matches].reverse();
    chronological.forEach((m) => {
      const aRes = m.score_a > m.score_b ? 'W' : m.score_a < m.score_b ? 'L' : 'D';
      const bRes = m.score_a > m.score_b ? 'L' : m.score_a < m.score_b ? 'W' : 'D';
      if (map[m.player_a]) map[m.player_a].push(aRes);
      if (map[m.player_b]) map[m.player_b].push(bRes);
    });
    return map;
  }, [matches, players]);

  const standings = [...players].sort((a, b) => b.elo - a.elo);

  async function submitMatch() {
    setMatchError('');
    if (!matchA || !matchB) {
      setMatchError('Pick both players.');
      return;
    }
    if (matchA === matchB) {
      setMatchError("A player can\u2019t play themselves.");
      return;
    }
    if (scoreA === '' || scoreB === '' || isNaN(scoreA) || isNaN(scoreB)) {
      setMatchError('Enter a final score for both sides.');
      return;
    }
    setBusy(true);
    try {
      let screenshotUrl = null;
      if (screenshotFile) {
        setUploadingScreenshot(true);
        try {
          screenshotUrl = await uploadScreenshot(screenshotFile);
        } catch (e) {
          setMatchError('Screenshot upload failed — try a smaller image or skip it.');
          setUploadingScreenshot(false);
          setBusy(false);
          return;
        }
        setUploadingScreenshot(false);
      }

      const res = await fetch('/api/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerA: matchA,
          playerB: matchB,
          scoreA,
          scoreB,
          submittedBy,
          screenshotUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMatchError(data.error || 'Could not submit result.');
      } else {
        setMatchA('');
        setMatchB('');
        setScoreA('');
        setScoreB('');
        setSubmittedBy('');
        setScreenshotFile(null);
        setSubmitOk(true);
        setTimeout(() => setSubmitOk(false), 2500);
        await loadAll();
      }
    } catch (e) {
      setMatchError('Network error — try again.');
    }
    setBusy(false);
  }

  async function loadHeadToHead(a, b) {
    if (!a || !b || a === b) {
      setH2hMatches(null);
      return;
    }
    setH2hLoading(true);
    try {
      const res = await fetch(`/api/head-to-head?a=${a}&b=${b}`);
      const data = await res.json();
      setH2hMatches(Array.isArray(data) ? data : []);
    } catch (e) {
      setH2hMatches([]);
    }
    setH2hLoading(false);
  }

  useEffect(() => {
    loadHeadToHead(h2hA, h2hB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h2hA, h2hB]);

  const h2hSummary = useMemo(() => {
    if (!h2hMatches || !h2hA || !h2hB) return null;
    let aWins = 0;
    let bWins = 0;
    let draws = 0;
    let aGoals = 0;
    let bGoals = 0;
    h2hMatches.forEach((m) => {
      const aIsA = m.player_a === h2hA;
      const goalsForA = aIsA ? m.score_a : m.score_b;
      const goalsForB = aIsA ? m.score_b : m.score_a;
      aGoals += goalsForA;
      bGoals += goalsForB;
      if (goalsForA > goalsForB) aWins += 1;
      else if (goalsForA < goalsForB) bWins += 1;
      else draws += 1;
    });
    return { aWins, bWins, draws, aGoals, bGoals, total: h2hMatches.length };
  }, [h2hMatches, h2hA, h2hB]);

  const tabs = [
    { id: 'leaderboard', label: 'Table', icon: Trophy },
    { id: 'submit', label: 'Report Result', icon: Swords },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'h2h', label: 'Head-to-Head', icon: Repeat },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <header className="mb-8">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1 className="font-display font-bold text-5xl sm:text-6xl uppercase leading-none tracking-wide">
            The Table
          </h1>
          <div className="font-mono text-muted text-xs sm:text-sm text-right">
            <div>{players.length} players</div>
            <div>{matches.length} matches logged</div>
            {pending.length > 0 && <div className="text-gold">{pending.length} awaiting approval</div>}
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
          <p className="text-muted text-sm">
            {season?.current ? `${season.current.name} \u00b7 ` : ''}
            ELO ratings move with every result. Beat someone above you, climb the table.
          </p>
          <Link href="/admin" className="flex items-center gap-1 text-xs text-muted hover:text-chalk">
            <ShieldCheck size={14} /> Admin
          </Link>
        </div>
      </header>

      <nav className="flex gap-1 mb-6 overflow-x-auto border-b border-white/10">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap transition-colors -mb-px border-b-2 ${
                active ? 'text-chalk border-lime' : 'text-muted border-transparent'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {loading ? (
        <div className="text-muted text-sm">Loading the table\u2026</div>
      ) : (
        <>
          {tab === 'leaderboard' && (
            <section>
              {standings.length === 0 ? (
                <div className="bg-panel border border-white/10 rounded-lg p-6 text-center">
                  <Users size={28} className="text-muted mx-auto mb-2" />
                  <p className="text-muted text-sm">
                    No players yet. An admin can add your group from the Admin panel.
                  </p>
                </div>
              ) : (
                <div className="bg-panel border border-white/10 rounded-lg overflow-hidden">
                  {standings.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/players/${p.id}`}
                      className={`flex items-center gap-4 px-4 py-3 hover:bg-panelAlt transition-colors ${
                        i === standings.length - 1 ? '' : 'border-b border-white/10'
                      }`}
                    >
                      <div
                        className={`font-display font-semibold text-3xl w-8 text-right ${
                          i === 0 ? 'text-gold' : 'text-muted'
                        }`}
                      >
                        {i + 1}
                      </div>
                      {p.team_picture_url ? (
                        <img
                          src={p.team_picture_url}
                          alt=""
                          className="w-9 h-9 rounded-md object-cover flex-shrink-0 border border-white/10"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-panelAlt flex-shrink-0 border border-white/10" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <FormDots form={formByPlayer[p.id]} />
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg">{p.elo}</div>
                        <div className="text-muted text-xs mt-1">
                          {p.wins}W {p.draws}D {p.losses}L
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <p className="text-muted text-xs mt-3">
                Tap a player to view their profile, team picture, and highest rank.
              </p>
            </section>
          )}

          {tab === 'submit' && (
            <section className="bg-panel border border-white/10 rounded-lg p-4 sm:p-5">
              {players.length < 2 ? (
                <p className="text-muted text-sm">
                  At least two players are needed before you can report a result.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-muted text-xs uppercase tracking-wide mb-1">Home</label>
                      <select
                        value={matchA}
                        onChange={(e) => setMatchA(e.target.value)}
                        className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
                      >
                        <option value="">Select player</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={scoreA}
                        onChange={(e) => setScoreA(e.target.value)}
                        placeholder="Goals"
                        className="w-full rounded-md px-3 py-2 text-sm mt-2 bg-panelAlt border border-white/10 text-chalk font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-muted text-xs uppercase tracking-wide mb-1">Away</label>
                      <select
                        value={matchB}
                        onChange={(e) => setMatchB(e.target.value)}
                        className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
                      >
                        <option value="">Select player</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={scoreB}
                        onChange={(e) => setScoreB(e.target.value)}
                        placeholder="Goals"
                        className="w-full rounded-md px-3 py-2 text-sm mt-2 bg-panelAlt border border-white/10 text-chalk font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-muted text-xs uppercase tracking-wide mb-1">Reported by</label>
                    <input
                      value={submittedBy}
                      onChange={(e) => setSubmittedBy(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
                    />
                  </div>

                  <div>
                    <label className="block text-muted text-xs uppercase tracking-wide mb-1">
                      Screenshot (optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-panelAlt file:px-3 file:py-2 file:text-chalk file:text-sm"
                    />
                    {screenshotFile && (
                      <p className="text-muted text-xs mt-1 flex items-center gap-1">
                        <ImageIcon size={12} /> {screenshotFile.name}
                      </p>
                    )}
                    <p className="text-muted text-xs mt-1">
                      A screenshot of the final score helps the admin verify the result.
                    </p>
                  </div>

                  {matchError && <p className="text-coral text-sm">{matchError}</p>}
                  {submitOk && (
                    <p className="text-lime text-sm">
                      Sent for approval. It\u2019ll hit the table once an admin confirms it.
                    </p>
                  )}

                  <button
                    onClick={submitMatch}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium bg-lime text-pitch disabled:opacity-60"
                  >
                    {uploadingScreenshot ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Uploading screenshot\u2026
                      </>
                    ) : (
                      'Submit result for approval'
                    )}
                  </button>
                </div>
              )}
            </section>
          )}

          {tab === 'stats' && (
            <section className="space-y-6">
              {!stats ? (
                <p className="text-muted text-sm">Loading stats\u2026</p>
              ) : (
                <>
                  <StatBlock
                    title="This week"
                    eloLeaders={stats.weekly.eloLeaders}
                    winRateLeaders={stats.weekly.winRateLeaders}
                    minGames={stats.weekly.minGames}
                  />
                  <StatBlock
                    title="This month"
                    eloLeaders={stats.monthly.eloLeaders}
                    winRateLeaders={stats.monthly.winRateLeaders}
                    minGames={stats.monthly.minGames}
                  />

                  <div>
                    <h3 className="flex items-center gap-2 font-display font-semibold text-xl uppercase tracking-wide mb-2">
                      <Target size={18} /> Top scorers {season?.current ? `\u2014 ${season.current.name}` : ''}
                    </h3>
                    {stats.topScorers.length === 0 ? (
                      <div className="bg-panel border border-white/10 rounded-lg p-4 text-muted text-sm">
                        No goals recorded yet this season.
                      </div>
                    ) : (
                      <div className="bg-panel border border-white/10 rounded-lg overflow-hidden">
                        {stats.topScorers.map((s, i) => (
                          <div
                            key={s.playerId}
                            className={`flex items-center justify-between px-4 py-2.5 ${
                              i === stats.topScorers.length - 1 ? '' : 'border-b border-white/10'
                            }`}
                          >
                            <span className="text-sm">{i + 1}. {s.name}</span>
                            <span className="font-mono text-sm text-lime">{s.goals} goals</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {tab === 'h2h' && (
            <section>
              {players.length < 2 ? (
                <div className="bg-panel border border-white/10 rounded-lg p-6 text-center">
                  <p className="text-muted text-sm">Add at least two players to compare records.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-muted text-xs uppercase tracking-wide mb-1">Player 1</label>
                      <select
                        value={h2hA}
                        onChange={(e) => setH2hA(e.target.value)}
                        className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
                      >
                        <option value="">Select player</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-muted text-xs uppercase tracking-wide mb-1">Player 2</label>
                      <select
                        value={h2hB}
                        onChange={(e) => setH2hB(e.target.value)}
                        className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
                      >
                        <option value="">Select player</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!h2hA || !h2hB ? (
                    <div className="bg-panel border border-white/10 rounded-lg p-6 text-center">
                      <Repeat size={24} className="text-muted mx-auto mb-2" />
                      <p className="text-muted text-sm">Pick two players to see their head-to-head record.</p>
                    </div>
                  ) : h2hA === h2hB ? (
                    <p className="text-coral text-sm">Pick two different players.</p>
                  ) : h2hLoading ? (
                    <p className="text-muted text-sm">Loading\u2026</p>
                  ) : h2hSummary && h2hSummary.total === 0 ? (
                    <div className="bg-panel border border-white/10 rounded-lg p-6 text-center">
                      <p className="text-muted text-sm">
                        {playerName(h2hA)} and {playerName(h2hB)} haven\u2019t played each other yet.
                      </p>
                    </div>
                  ) : h2hSummary ? (
                    <>
                      <div className="bg-panel border border-white/10 rounded-lg p-4">
                        <div className="grid grid-cols-3 text-center items-center">
                          <div>
                            <div className="font-medium truncate">{playerName(h2hA)}</div>
                            <div className="font-display font-bold text-4xl text-lime">{h2hSummary.aWins}</div>
                            <div className="text-muted text-xs">wins</div>
                          </div>
                          <div>
                            <div className="text-muted text-xs uppercase tracking-wide">Draws</div>
                            <div className="font-display font-bold text-4xl text-gold">{h2hSummary.draws}</div>
                            <div className="text-muted text-xs">{h2hSummary.total} played</div>
                          </div>
                          <div>
                            <div className="font-medium truncate">{playerName(h2hB)}</div>
                            <div className="font-display font-bold text-4xl text-lime">{h2hSummary.bWins}</div>
                            <div className="text-muted text-xs">wins</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10 text-center font-mono text-sm text-muted">
                          Goals: {h2hSummary.aGoals} \u2013 {h2hSummary.bGoals}
                        </div>
                      </div>

                      <div className="bg-panel border border-white/10 rounded-lg overflow-hidden">
                        {h2hMatches.map((m, i) => (
                          <div
                            key={m.id}
                            className={`px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${
                              i === h2hMatches.length - 1 ? '' : 'border-b border-white/10'
                            }`}
                          >
                            <div className="font-mono text-sm">
                              {playerName(m.player_a)}{' '}
                              <span className="text-muted">
                                {m.score_a} \u2013 {m.score_b}
                              </span>{' '}
                              {playerName(m.player_b)}
                            </div>
                            <div className="text-muted text-xs">
                              {new Date(m.approved_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </section>
          )}

          {tab === 'history' && (
            <section>
              {matches.length === 0 ? (
                <div className="bg-panel border border-white/10 rounded-lg p-6 text-center">
                  <p className="text-muted text-sm">No matches confirmed yet.</p>
                </div>
              ) : (
                <div className="bg-panel border border-white/10 rounded-lg overflow-hidden">
                  {matches.map((m, i) => (
                    <div
                      key={m.id}
                      className={`px-4 py-3 ${i === matches.length - 1 ? '' : 'border-b border-white/10'}`}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="font-mono text-sm sm:text-base">
                          {playerName(m.player_a)}{' '}
                          <span className="text-muted">
                            {m.score_a} \u2013 {m.score_b}
                          </span>{' '}
                          {playerName(m.player_b)}
                        </div>
                        <div className="flex items-center gap-3">
                          {m.screenshot_url && (
                            <a
                              href={m.screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted hover:text-lime"
                              title="View screenshot"
                            >
                              <ImageIcon size={14} />
                            </a>
                          )}
                          <div className="text-muted text-xs">
                            {new Date(m.approved_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs font-mono">
                        <span className={m.delta_a >= 0 ? 'text-lime' : 'text-coral'}>
                          {playerName(m.player_a)} {m.delta_a >= 0 ? '+' : ''}
                          {m.delta_a} \u2192 {m.elo_a_after}
                        </span>
                        <span className={m.delta_b >= 0 ? 'text-lime' : 'text-coral'}>
                          {playerName(m.player_b)} {m.delta_b >= 0 ? '+' : ''}
                          {m.delta_b} \u2192 {m.elo_b_after}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatBlock({ title, eloLeaders, winRateLeaders, minGames }) {
  return (
    <div>
      <h3 className="font-display font-semibold text-xl uppercase tracking-wide mb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-muted text-xs uppercase tracking-wide mb-1">Most ELO gained</p>
          {eloLeaders.length === 0 ? (
            <div className="bg-panel border border-white/10 rounded-lg p-3 text-muted text-sm">No matches yet.</div>
          ) : (
            <div className="bg-panel border border-white/10 rounded-lg overflow-hidden">
              {eloLeaders.map((l, i) => (
                <div
                  key={l.playerId}
                  className={`flex items-center justify-between px-3 py-2 text-sm ${
                    i === eloLeaders.length - 1 ? '' : 'border-b border-white/10'
                  }`}
                >
                  <span>{i + 1}. {l.name}</span>
                  <span className={`font-mono ${l.eloGain >= 0 ? 'text-lime' : 'text-coral'}`}>
                    {l.eloGain >= 0 ? '+' : ''}{l.eloGain}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-muted text-xs uppercase tracking-wide mb-1">Best win rate (min {minGames} games)</p>
          {winRateLeaders.length === 0 ? (
            <div className="bg-panel border border-white/10 rounded-lg p-3 text-muted text-sm">
              Not enough matches yet.
            </div>
          ) : (
            <div className="bg-panel border border-white/10 rounded-lg overflow-hidden">
              {winRateLeaders.map((l, i) => (
                <div
                  key={l.playerId}
                  className={`flex items-center justify-between px-3 py-2 text-sm ${
                    i === winRateLeaders.length - 1 ? '' : 'border-b border-white/10'
                  }`}
                >
                  <span>{i + 1}. {l.name}</span>
                  <span className="font-mono text-lime">
                    {Math.round(l.winRate * 100)}% ({l.wins}/{l.games})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
