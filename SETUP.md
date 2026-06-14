# eFootball League — The Table

A shared ELO leaderboard for your eFootball group. Built with Next.js (App Router) +
Supabase (Postgres). Anyone can add players and report results; an admin PIN is
required to approve/reject results before they affect ratings.

## What's already done

- ✅ Supabase project created (free tier) with `players`, `matches`, and
  `pending_matches` tables, RLS policies enabled.
- ✅ The Supabase URL + anon key are already filled in at `lib/supabase.js`
  (these are safe to expose — the anon key is meant to be public, and access is
  controlled by the RLS policies in the database).
- ✅ App builds cleanly with `npm run build`.

## 1. Push to GitHub

```bash
unzip efootball-app.zip
cd efootball-app
git init
git add .
git commit -m "Initial commit: eFootball ELO leaderboard"
```

Create a new empty repo on GitHub (no README/license), then:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

## 2. Deploy on Vercel

1. Go to https://vercel.com/new
2. Import the GitHub repo you just pushed.
3. Framework preset should auto-detect as **Next.js** — no extra config needed.
4. Click **Deploy**.

That's it — no environment variables are required to get started, since the
Supabase credentials are already in the code. (See "Optional" below if you'd
rather move them to env vars.)

## 3. Use it

- **Table** — the live leaderboard, sorted by ELO. Add players here.
- **Report Result** — anyone can log a match result; it goes to a pending queue.
- **Approvals** — requires the admin PIN (default: `2026`) to approve/reject.
  Approving a result updates both players' ELO using the standard ELO formula
  (K-factor = 32).
- **Head-to-Head** — pick two players to see their record against each other.
- **History** — full log of confirmed matches with ELO changes.

## Changing the admin PIN

Edit `lib/config.js`:

```js
export const ADMIN_PIN = '2026'; // change me
```

Commit and push — Vercel will redeploy automatically.

## Optional: move Supabase credentials to environment variables

If you'd rather not have the Supabase URL/key in the repo, in your Vercel
project go to **Settings → Environment Variables** and add:

- `SUPABASE_URL` = `https://qjogykolbwnxundhjxqr.supabase.co`
- `SUPABASE_ANON_KEY` = (the anon key currently in `lib/supabase.js`)

`lib/supabase.js` already prefers these env vars if they're set, and falls
back to the hardcoded values otherwise.

## Local development

```bash
npm install
npm run dev
```

Visit http://localhost:3000
