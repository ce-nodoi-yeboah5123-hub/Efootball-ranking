'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ListChecks,
  Users,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { signOut } from '../../lib/supabaseClient';

export default function AdminDashboard() {
  const router = useRouter();

  const [players, setPlayers] = useState([]);
  const [pending, setPending] = useState([]);
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'success', text }

  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [resetConfirming, setResetConfirming] = useState(false);
  const [nextSeasonName, setNextSeasonName] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [playersRes, pendingRes, seasonRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/pending'),
        fetch('/api/season'),
      ]);
      setPlayers(await playersRes.json());
      setPending(await pendingRes.json());
      setSeason(await seasonRes.json());
    } catch (e) {
      setMessage({ type: 'error', text: 'Could not load admin data.' });
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

  async function handleLogout() {
    await signOut();
    router.push('/admin/login');
    router.refresh();
  }

  async function addPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not add player.' });
      } else {
        setNewPlayerName('');
        await loadAll();
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error — try again.' });
    }
    setBusy(false);
  }

  function startEdit(player) {
    setEditingId(player.id);
    setEditForm({
      name: player.name,
      elo: player.elo,
      wins: player.wins,
      draws: player.draws,
      losses: player.losses,
      highest_rank: player.highest_rank || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit(id) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/players/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not save changes.' });
      } else {
        cancelEdit();
        await loadAll();
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error — try again.' });
    }
    setBusy(false);
  }

  async function deletePlayer(id) {
    if (!window.confirm(`Remove ${playerName(id)} from the table? Their match history stays, but they\u2019ll no longer appear in the roster.`)) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/players/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not delete player.' });
      } else {
        await loadAll();
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error — try again.' });
    }
    setBusy(false);
  }

  async function approveMatch(id) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pending/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not approve.' });
      } else {
        await loadAll();
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error — try again.' });
    }
    setBusy(false);
  }

  async function rejectMatch(id) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/pending/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not reject.' });
      } else {
        await loadAll();
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error — try again.' });
    }
    setBusy(false);
  }

  async function resetSeason() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/season/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextSeasonName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not reset the season.' });
      } else {
        setMessage({ type: 'success', text: `${data.newSeason.name} has started. Standings are archived.` });
        setResetConfirming(false);
        setNextSeasonName('');
        await loadAll();
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error — try again.' });
    }
    setBusy(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <header className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="font-display font-bold text-5xl uppercase leading-none tracking-wide">Admin</h1>
          <p className="text-muted text-sm mt-2">
            {season?.current ? `Current: ${season.current.name}` : 'Manage your roster, results, and seasons.'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium border border-white/10 text-muted hover:text-chalk"
        >
          <LogOut size={16} /> Sign out
        </button>
      </header>

      {message && (
        <div
          className={`rounded-md px-3 py-2 text-sm mb-4 ${
            message.type === 'error' ? 'bg-coral/10 text-coral border border-coral/30' : 'bg-lime/10 text-lime border border-lime/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : (
        <div className="space-y-8">
          {/* Pending approvals */}
          <section>
            <h2 className="flex items-center gap-2 font-display font-semibold text-2xl uppercase tracking-wide mb-3">
              <ListChecks size={20} /> Approvals
              {pending.length > 0 && (
                <span className="font-mono text-xs px-1.5 py-0.5 rounded-full bg-lime text-pitch">{pending.length}</span>
              )}
            </h2>
            {pending.length === 0 ? (
              <div className="bg-panel border border-white/10 rounded-lg p-4 text-muted text-sm">
                Nothing waiting for approval.
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((entry) => (
                  <div key={entry.id} className="bg-panel border border-white/10 rounded-lg p-4">
                    <div className="font-mono text-base">
                      {playerName(entry.player_a)}{' '}
                      <span className="text-muted">{entry.score_a} – {entry.score_b}</span>{' '}
                      {playerName(entry.player_b)}
                    </div>
                    <div className="text-muted text-xs mt-1">
                      Reported by {entry.submitted_by} · {new Date(entry.created_at).toLocaleString()}
                    </div>
                    {entry.screenshot_url && (
                      <a href={entry.screenshot_url} target="_blank" rel="noopener noreferrer" className="block mt-3">
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
                ))}
              </div>
            )}
          </section>

          {/* Roster management */}
          <section>
            <h2 className="flex items-center gap-2 font-display font-semibold text-2xl uppercase tracking-wide mb-3">
              <Users size={20} /> Roster
            </h2>
            <div className="bg-panel border border-white/10 rounded-lg overflow-hidden">
              {players.length === 0 ? (
                <div className="p-4 text-muted text-sm">No players yet.</div>
              ) : (
                players.map((p, i) => (
                  <div
                    key={p.id}
                    className={`p-4 ${i === players.length - 1 ? '' : 'border-b border-white/10'}`}
                  >
                    {editingId === p.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-muted text-xs uppercase tracking-wide mb-1">Name</label>
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {['elo', 'wins', 'draws', 'losses'].map((field) => (
                            <div key={field}>
                              <label className="block text-muted text-xs uppercase tracking-wide mb-1 capitalize">
                                {field}
                              </label>
                              <input
                                type="number"
                                value={editForm[field]}
                                onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                                className="w-full rounded-md px-2 py-2 text-sm bg-panelAlt border border-white/10 text-chalk font-mono"
                              />
                            </div>
                          ))}
                        </div>
                        <div>
                          <label className="block text-muted text-xs uppercase tracking-wide mb-1">
                            Highest eFootball rank
                          </label>
                          <input
                            value={editForm.highest_rank}
                            onChange={(e) => setEditForm({ ...editForm, highest_rank: e.target.value })}
                            placeholder="e.g. Division 1, Legend"
                            className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => saveEdit(p.id)}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-lime text-pitch disabled:opacity-60"
                          >
                            <Save size={14} /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium border border-white/10 text-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-muted text-xs mt-0.5">
                            ELO {p.elo} · {p.wins}W {p.draws}D {p.losses}L
                            {p.highest_rank ? ` · Highest rank: ${p.highest_rank}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => startEdit(p)}
                          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm border border-white/10 text-muted hover:text-chalk"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deletePlayer(p.id)}
                          disabled={busy}
                          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm border border-coral text-coral disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                placeholder="New player name"
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
          </section>

          {/* Season management */}
          <section>
            <h2 className="flex items-center gap-2 font-display font-semibold text-2xl uppercase tracking-wide mb-3">
              <RotateCcw size={20} /> Season
            </h2>
            <div className="bg-panel border border-white/10 rounded-lg p-4">
              <p className="text-sm mb-1">
                Current: <span className="font-medium">{season?.current?.name || 'None'}</span>
              </p>
              <p className="text-muted text-xs mb-4">
                Resetting archives everyone's current ELO and record, then resets all players to {1000} ELO with a
                clean 0–0–0 record. Match history and screenshots stay intact, and the old standings remain viewable
                as a past season.
              </p>

              {!resetConfirming ? (
                <button
                  onClick={() => setResetConfirming(true)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium border border-coral text-coral"
                >
                  <RotateCcw size={16} /> Reset table for a new season
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    value={nextSeasonName}
                    onChange={(e) => setNextSeasonName(e.target.value)}
                    placeholder={`Season name (optional, e.g. "Season 2")`}
                    className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={resetSeason}
                      disabled={busy}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-coral text-pitch disabled:opacity-60"
                    >
                      <ShieldCheck size={16} /> Confirm reset
                    </button>
                    <button
                      onClick={() => setResetConfirming(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium border border-white/10 text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {season?.past?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-muted text-xs uppercase tracking-wide mb-2">Past seasons</p>
                  {season.past.map((s) => (
                    <div key={s.id} className="text-sm mb-1">
                      {s.name} — ended {new Date(s.ended_at).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
