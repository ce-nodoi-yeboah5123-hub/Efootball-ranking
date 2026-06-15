# eFootball League — The Table

A shared ELO leaderboard for your eFootball group, with seasons, stats, player
profiles, and an admin panel — built on Next.js + Supabase.

## What's new in this version

- **Real admin login** (Supabase Auth) at `/admin/login`. The admin dashboard
  (`/admin`) lets you add, edit, and delete players, approve/reject reported
  results, and reset the table for a new season.
- **Seasons**: resetting the table archives the current standings (viewable
  later) and starts everyone fresh at 1000 ELO with a clean record. Match
  history is preserved.
- **Stats tab**: weekly and monthly leaderboards for "most ELO gained" and
  "best win rate" (minimum 2 games), plus top goal scorers for the current
  season.
- **Player profiles** (`/players/[id]`): every player gets a page showing
  their stats, recent matches, and lets them set their own team/club picture
  and highest-ever rank in eFootball's real online ranking — no login needed
  for this part, anyone can edit their own profile page.

## One-time setup: create your admin account

1. Go to your Supabase project's Authentication users page:
   https://supabase.com/dashboard/project/qjogykolbwnxundhjxqr/auth/users
2. Click **Add user** → **Create new user**.
3. Enter an email and password — this becomes your admin login.
4. Use those credentials at `https://your-site.vercel.app/admin/login`.

You can add more admin accounts the same way if you want multiple people to
have admin access.

## Deploying the update

This update adds new files and folders (an `app/admin` section, `app/players`,
new API routes, and `middleware.js` at the project root) and edits some
existing ones, plus a new dependency (`@supabase/ssr`).

The simplest way to apply it:

1. Unzip this new `efootball-app.zip`.
2. On your GitHub repo page, click **Add file → Upload files**.
3. Drag in the entire contents of the unzipped `efootball-app` folder
   (all files and folders — `app`, `lib`, `middleware.js`, `package.json`,
   `package-lock.json`, etc.). GitHub will show which files are new vs. changed.
4. Commit the changes.

Vercel will automatically rebuild and redeploy — check the **Deployments**
tab in your Vercel dashboard.

## How it all fits together

- **The Table** (home page) — public leaderboard. Tap any player to view
  their profile.
- **Report Result** — open to anyone, optional screenshot.
- **Stats** — weekly/monthly top performers and season goal scorers.
- **Head-to-Head** / **History** — unchanged.
- **Admin** (`/admin`) — login required. Approve/reject results, manage the
  roster (add/edit/delete players, set their highest rank), and reset the
  season.
- **Player profile** (`/players/[id]`) — anyone can set their own team
  picture and highest rank here.

## Local development

```bash
npm install
npm run dev
```

Visit http://localhost:3000 — note that `/admin` requires a real Supabase
login (see setup above), it won't work with the old PIN.
