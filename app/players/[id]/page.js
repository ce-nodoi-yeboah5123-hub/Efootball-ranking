'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Image as ImageIcon, Save, Loader2, Award } from 'lucide-react';
import { uploadTeamPicture } from '../../../lib/supabaseClient';

function FormDots({ form }) {
  const last5 = (form || []).slice(-5).reverse();
  const slots = [...last5, ...Array(5 - last5.length).fill(null)];
  return (
    <div className="flex gap-1">
      {slots.map((r, i) => {
        let bg = 'rgba(244,241,232,0.08)';
        if (r === 'W') bg = '#9FE870';
        if (r === 'D') bg = '#E8C468';
        if (r === 'L') bg = '#FF6B5B';
        return <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: bg }} />;
      })}
    </div>
  );
}

export default function PlayerProfile({ params }) {
  const { id } = params;

  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [playerNames, setPlayerNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [rankInput, setRankInput] = useState('');
  const [pictureFile, setPictureFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [playersRes, matchesRes] = await Promise.all([fetch('/api/players'), fetch('/api/matches')]);
      const players = await playersRes.json();
      const allMatches = await matchesRes.json();

      const names = {};
      players.forEach((p) => (names[p.id] = p.name));
      setPlayerNames(names);

      const found = players.find((p) => p.id === id);
      setPlayer(found || null);
      setRankInput(found?.highest_rank || '');
      setMatches(allMatches.filter((m) => m.player_a === id || m.player_b === id));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const form = (() => {
    const chronological = [...matches].reverse();
    return chronological.map((m) => {
      const isA = m.player_a === id;
      const myScore = isA ? m.score_a : m.score_b;
      const theirScore = isA ? m.score_b : m.score_a;
      if (myScore > theirScore) return 'W';
      if (myScore < theirScore) return 'L';
      return 'D';
    });
  })();

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    try {
      let teamPictureUrl;
      if (pictureFile) {
        try {
          teamPictureUrl = await uploadTeamPicture(pictureFile);
        } catch (e) {
          setMessage({ type: 'error', text: 'Picture upload failed — try a smaller image.' });
          setSaving(false);
          return;
        }
      }

      const body = { highestRank: rankInput };
      if (teamPictureUrl) body.teamPictureUrl = teamPictureUrl;

      const res = await fetch(`/api/players/${id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not save.' });
      } else {
        setPlayer(data);
        setPictureFile(null);
        setMessage({ type: 'success', text: 'Profile updated.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error — try again.' });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-muted text-sm">Loading\u2026</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/" className="flex items-center gap-2 text-muted text-sm mb-4 hover:text-chalk">
          <ArrowLeft size={16} /> Back to The Table
        </Link>
        <div className="bg-panel border border-white/10 rounded-lg p-6 text-center">
          <p className="text-muted text-sm">Player not found — they may have been removed from the roster.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/" className="flex items-center gap-2 text-muted text-sm mb-6 hover:text-chalk">
        <ArrowLeft size={16} /> Back to The Table
      </Link>

      <div className="flex items-center gap-4 mb-6">
        {player.team_picture_url ? (
          <img
            src={player.team_picture_url}
            alt=""
            className="w-20 h-20 rounded-lg object-cover border border-white/10 flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-panel border border-white/10 flex items-center justify-center flex-shrink-0">
            <ImageIcon size={24} className="text-muted" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-display font-bold text-4xl sm:text-5xl uppercase leading-none truncate">
            {player.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-lg text-lime">{player.elo} ELO</span>
            <FormDots form={form} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-panel border border-white/10 rounded-lg p-3 text-center">
          <div className="font-display font-bold text-3xl text-lime">{player.wins}</div>
          <div className="text-muted text-xs uppercase tracking-wide">Wins</div>
        </div>
        <div className="bg-panel border border-white/10 rounded-lg p-3 text-center">
          <div className="font-display font-bold text-3xl text-gold">{player.draws}</div>
          <div className="text-muted text-xs uppercase tracking-wide">Draws</div>
        </div>
        <div className="bg-panel border border-white/10 rounded-lg p-3 text-center">
          <div className="font-display font-bold text-3xl text-coral">{player.losses}</div>
          <div className="text-muted text-xs uppercase tracking-wide">Losses</div>
        </div>
      </div>

      {player.highest_rank && (
        <div className="bg-panel border border-white/10 rounded-lg p-3 mb-6 flex items-center gap-2">
          <Award size={18} className="text-gold flex-shrink-0" />
          <span className="text-sm">
            Highest eFootball rank: <span className="font-medium">{player.highest_rank}</span>
          </span>
        </div>
      )}

      <div className="bg-panel border border-white/10 rounded-lg p-4 mb-6">
        <h2 className="font-display font-semibold text-xl uppercase tracking-wide mb-3">Edit your profile</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-muted text-xs uppercase tracking-wide mb-1">Team / club picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPictureFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-panelAlt file:px-3 file:py-2 file:text-chalk file:text-sm"
            />
            {pictureFile && <p className="text-muted text-xs mt-1">{pictureFile.name}</p>}
          </div>
          <div>
            <label className="block text-muted text-xs uppercase tracking-wide mb-1">
              Highest rank ever reached (real eFootball ranking)
            </label>
            <input
              value={rankInput}
              onChange={(e) => setRankInput(e.target.value)}
              placeholder="e.g. Division 1, Legend"
              className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
            />
          </div>
          {message && (
            <p className={`text-sm ${message.type === 'error' ? 'text-coral' : 'text-lime'}`}>{message.text}</p>
          )}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-lime text-pitch disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-display font-semibold text-xl uppercase tracking-wide mb-2">Recent matches</h2>
        {matches.length === 0 ? (
          <div className="bg-panel border border-white/10 rounded-lg p-4 text-muted text-sm">
            No confirmed matches yet.
          </div>
        ) : (
          <div className="bg-panel border border-white/10 rounded-lg overflow-hidden">
            {matches.map((m, i) => {
              const isA = m.player_a === id;
              const opponentId = isA ? m.player_b : m.player_a;
              const myScore = isA ? m.score_a : m.score_b;
              const theirScore = isA ? m.score_b : m.score_a;
              const delta = isA ? m.delta_a : m.delta_b;
              return (
                <div
                  key={m.id}
                  className={`px-4 py-3 flex items-center justify-between gap-3 ${
                    i === matches.length - 1 ? '' : 'border-b border-white/10'
                  }`}
                >
                  <Link href={`/players/${opponentId}`} className="font-mono text-sm hover:text-lime">
                    vs {playerNames[opponentId] || 'Opponent'}{' '}
                    <span className="text-muted">{myScore} \u2013 {theirScore}</span>
                  </Link>
                  <span className={`font-mono text-xs ${delta >= 0 ? 'text-lime' : 'text-coral'}`}>
                    {delta >= 0 ? '+' : ''}{delta}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}