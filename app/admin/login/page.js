'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, ShieldAlert } from 'lucide-react';
import { signIn } from '../../../lib/supabaseClient';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    }
    setBusy(false);
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="text-center mb-8">
        <h1 className="font-display font-bold text-5xl uppercase leading-none tracking-wide">
          Admin
        </h1>
        <p className="text-muted text-sm mt-2">Sign in to manage The Table.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-panel border border-white/10 rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-muted text-xs uppercase tracking-wide mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
          />
        </div>
        <div>
          <label className="block text-muted text-xs uppercase tracking-wide mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-white/10 text-chalk"
          />
        </div>

        {error && (
          <p className="text-coral text-sm flex items-center gap-2">
            <ShieldAlert size={14} /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium bg-lime text-pitch disabled:opacity-60"
        >
          <LogIn size={16} /> {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-muted text-xs text-center mt-4">
        Admin accounts are created in the Supabase dashboard under Authentication → Users.
      </p>
    </div>
  );
}
