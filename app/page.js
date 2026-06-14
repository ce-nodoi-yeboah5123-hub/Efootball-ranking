'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Plus,
  Check,
  X,
  Lock,
  Unlock,
  Swords,
  History,
  ListChecks,
  Users,
  Repeat,
  Image as ImageIcon,
  Loader2,
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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('leaderboard');
  const [busy, setBusy] = useState(false);

  // admin
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // add player
  const [newPlayerName, setNewPlayerName] = useState('');
  const [playerError, setPlayerError] = useState('');

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
      const [playersRes, matchesRes, pendingRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/matches'),
        fetch('/api/pending'),
      ]);
      setPlayers(await playersRes.json());
      setMatches(await matchesRes.json());
      setPending(await pendingRes.json());
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
    // matches are newest-first; reverse to chronological so slice(-5) in FormDots gives most recent last
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

  async function addPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    setBusy(true);
    setPlayerError('');
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlayerError(data.error || 'Could not add player.');
      } else {
        setNewPlayerName('');
        await loadAll();
      }
    } catch (e) {
      setPlayerError('Network error — try again.');
    }
    setBusy(false);
  }

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

  function checkPin() {
    if (pinInput === '2026' || pinInput.length > 0) {
      // actual check happens server-side per action; this just gates the UI
    }
    setAdminUnlocked(true);
    setPinError('');
  }

  async function approveMatch(id) {
    setBusy(true);
    try {
      const res = await fetch(`/api/pending/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setAdminUnlocked(false);
          setPinError('Incorrect PIN.');
        } else {
          setPinError(data.error || 'Could not approve.');
        }
      } else {
        await loadAll();
      }
    } catch (e) {
      setPinError('Network error — try again.');
    }
    setBusy(false);
  }

  async function rejectMatch(id) {
    setBusy(true);
    try {
      const res = await fetch(`/api/pending/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setAdminUnlocked(false);
          setPinError('Incorrect PIN.');
        } else {
          setPinError(data.error || 'Could not reject.');
        }
      } else {
        await loadAll();
      }
    } catch (e) {
      setPinError('Network error — try again.');
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
    { id: 'pending', label: 'Approvals', icon: ListChecks, badge: pending.length },
    { id: 'h2h', label: 'Head-to-Head', icon: Repeat },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <header className="mb-8">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1 className="font-display font-bold text-5xl sm:text-6xl uppercase leading-none tracking-wide">
            THE SUPER LEAGUE🔥🔥
          </h1>
          <div className="font-mono text-muted text-xs sm:text-sm text-right">
            <div>{players.length} players</div>
            <div>{matches.length} matches logged</div>
          </div>
        </div>
        <p className="text-muted mt-2 text-sm">
          ELO ratings move with every result. Beat someone above you, climb the table.
        </p>
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
              {t.badge ? (
                <span className="font-mono text-xs px-1.5 py-0.5 rounded-full bg-lime text-pitch">
                  {t.badge}
                </span>
              ) : null}
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
                    No players yet. Add your group below to open the table.
                  </p>
                </div>
              ) : (
                <div className="bg-panel border border-white/10 rounded-lg overflow-hidden">
                  {standings.map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-4 px-4 py-3 ${
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
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <div className="text-muted text-xs uppercase tracking-wide mb-2">Add a player</div>
                <div className="flex gap-2">
                  <input
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                    placeholder="Player name"
                    className="flex-1 rounded-md px-3 py-2 text-sm bg-panel border border-white/10 text-chalk"
                  />
                  <button
                    onClick={addPlayer}
                    disabled={busy}
                    className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium bg-lime text-pitch disabled:opacity-60"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
                {playerError && <p className="text-coral text-xs mt-2">{playerError}</p>}
                <p className="text-muted text-xs mt-2">New players start on 1000 ELO.</p>
              </div>
            </section>
          )}

          {tab === 'submit' && (
            <section className="bg-panel border border-white/10 rounded-lg p-4 sm:p-5">
              {players.length < 2 ? (
                <p className="text-muted text-sm">
                  Add at least two players on the Table tab before reporting a result.
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
                      Screenshot (optional) But Try and include one!👌
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

          {tab === 'pending' && (
            <section>
              {!adminUnlocked ? (
                <div className="bg-panel border border-white/10 rounded-lg p-5 text-center">
                  <Lock size={24} className="text-muted mx-auto mb-2" />
                  <p className="text-muted text-sm mb-3">
                    Enter the admin PIN to approve or reject results.
                  </p>
                  <div className="flex gap-2 max-w-xs mx-auto">
                    <input
                      type="password"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && checkPin()}
                      placeholder="PIN"
                      className="flex-1 rounded-md px-3 py-2 text-sm text-center bg-panelAlt border border-white/10 text-chalk font-mono"
                    />
                    <button
                      onClick={checkPin}
                      className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium bg-lime text-pitch"
                    >
                      <Unlock size={16} /> Unlock
                    </button>
                  </div>
                  {pinError && <p className="text-coral text-xs mt-2">{pinError}</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {pinError && <p className="text-coral text-sm">{pinError}</p>}
                  {pending.length === 0 ? (
                    <div className="bg-panel border border-white/10 rounded-lg p-6 text-center">
                      <p className="text-muted text-sm">
                        Nothing waiting. Reported results will show up here.
                      </p>
                    </div>
                  ) : (
                    pending.map((entry) => (
                      <div key={entry.id} className="bg-panel border border-white/10 rounded-lg p-4">
                        <div className="font-mono text-base sm:text-lg">
                          {playerName(entry.player_a)}{' '}
                          <span className="text-muted">
                            {entry.score_a} \u2013 {entry.score_b}
                          </span>{' '}
                          {playerName(entry.player_b)}
                        </div>
                        <div className="text-muted text-xs mt-1">
                          Reported by {entry.submitted_by} \u00b7{' '}
                          {new Date(entry.created_at).toLocaleString()}
                        </div>
                        {entry.screenshot_url && (
                          <a
                            href={entry.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-3"
                          >
                            <img
                              src={entry.screenshot_url}
                              alt="Match result screenshot"
                              className="max-h-48 rounded-md border border-white/10 object-contain"
                            />
                          </a>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => approveMatch(entry.id)}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-lime text-pitch disabled:opacity-60"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            onClick={() => rejectMatch(entry.id)}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium border border-coral text-coral disabled:opacity-60"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
