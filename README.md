# EVRION — What type of Cameroonian are you?

A personality quiz built from relatable Cameroonian situations, with a full admin
panel so you (the one owner) can edit every category, question, chat scene,
answer, trait, and personality without touching code.

- **Frontend:** React + Vite
- **Backend/data:** Supabase (free tier) — one table holds all quiz content;
  Supabase Auth handles your single admin login
- **Hosting:** Vercel (free tier)

Nothing here needs you to be a professional developer — every step below is
done through a website UI, not the command line, except two `npm` commands.

---

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → sign up (free) → **New project**.
2. Give it a name and password, wait ~2 minutes for it to spin up.
3. Open the **SQL Editor** (left sidebar) → **New query**.
4. Paste in the contents of `supabase-setup.sql` (in this folder) and click **Run**.
   This creates the `evrion_content` table and locks it so anyone can read the
   quiz, but only a logged-in user (you) can edit it.
5. Run **New query** again, paste in `supabase-today-page.sql`, and click **Run**.
   This adds one more table that lets Today's Page polls work — anyone can
   vote and see results, but nobody can edit or delete a vote through the app
   (no new login is introduced by this).
6. Go to **Authentication → Users → Add user** and create yourself an account
   (your email + a password). This is your one admin login — don't enable public
   sign-ups anywhere.
7. Go to **Settings → API**. You'll need two values from this page in a minute:
   - **Project URL**
   - **anon public** key

---

## 2. Run it locally (optional, but good for checking it works)

You'll need [Node.js](https://nodejs.org) installed (any recent version).

```
npm install
cp .env.example .env.local
```

Open `.env.local` and paste in your Project URL and anon key from step 1.6.

```
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Tap **Admin** on the
home screen, sign in with the account you created, then click
**"Initialize content in Supabase"** — this pushes the starter quiz (11
situations, 5 personalities) into your database. From then on, everything you
edit in Admin is saved there.

---

## 3. Put the code on GitHub

1. Go to [github.com](https://github.com) → sign in → click **+ → New repository**.
   Name it `evrion`, choose Public or Private, click **Create repository**.
2. On the new repo page, click **Add file → Upload files**.
3. Drag in **every file and folder** from this project *except* `node_modules`
   (if you ran `npm install` locally) — `.gitignore` is already set up to skip
   it, but the drag-and-drop uploader doesn't read `.gitignore`, so just leave
   `node_modules` out of what you drag in.
4. Commit the changes.

(If you're comfortable with git commands instead, the usual `git init`,
`git add .`, `git commit`, `git remote add origin ...`, `git push` works too —
but the steps above need nothing installed beyond a browser.)

---

## 4. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → sign up with your GitHub account.
2. Click **Add New → Project**, pick your `evrion` repository, click **Import**.
3. Vercel will auto-detect it as a Vite project — leave the build settings as
   they are.
4. Before deploying, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your Project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon public key
5. Click **Deploy**. In about a minute you'll get a live link like
   `evrion.vercel.app` — that's your real, public, shareable EVRION website.

If you skipped the local step above, log into `/` on your live site, tap
**Admin**, sign in, and click **"Initialize content in Supabase"** once to
load the starter quiz.

---

## Today's Page (new in V1.1)

Today's Page is EVRION's content-driven daily front page. From Admin → **Today's Page**:

- Pick a date, add blocks (Text, Image, Video, Poll, Situation, Announcement/Feature, Button/Link), reorder them, edit or remove any of them.
- **Preview** shows exactly what the public page will look like before you commit to anything.
- **Save draft** keeps your work without showing it to visitors.
- **Publish** makes that date's page live at the public "🗓 Today's Page" link on the home screen.

If nobody has published *today's* date yet, visitors automatically see the most recently published page instead of a blank screen (with a small note showing which date they're looking at) — so the page never goes empty just because you didn't publish that exact morning.

Today's Page uses its own visual language (deep midnight background, electric violet, warm orange accents) — a first look at where EVRION's overall design is headed, without touching the rest of the app yet.

Adding a new block type later means adding one entry to `TODAY_BLOCK_TYPES`, one case in `defaultBlockData`, one render case in `TodayBlockPublic`, and one form section in `TodayBlockEditModal` — Today's Page itself doesn't need to change.

## Editing the quiz after launch

Everything is done from the **Admin** panel (link at the bottom of the home
screen) — no redeploying needed:

- **Categories** — add new quiz categories any time (e.g. a future "Naija
  Life" or "Diaspora Life" category); the app automatically lists whatever is
  active.
- **Questions** — each one holds a chat scene (add/remove lines, mark who's
  speaking) plus a prompt.
- **Answers & scoring** — each answer has a number per trait; that's the
  weight it adds to the player's score when picked.
- **Traits** — the underlying dimensions (Directness, Chill, Hustle, etc).
  Add your own if you want new axes.
- **Personalities** — the result types. Each has its own weight per trait,
  which is what the quiz compares the player's trait scores against to pick a
  winner and a match %.

## About security

There's exactly one login: whichever account you created in Supabase
Authentication. There's no public sign-up page anywhere in this app, and the
database rules (in `supabase-setup.sql`) only allow writes from a logged-in
session — so this is appropriately locked down for a single-owner admin panel.
If you ever want a second admin, just add another user in the same
Authentication tab.

## Adding "How Cameroonian are you?" later

The scoring system already separates traits, weights, and personalities from
the quiz questions themselves, so a future "% Cameroonian" meter can reuse the
same trait-score data — it would just read the same per-answer weights and
map them to a percentage instead of (or alongside) picking a personality. No
rebuild required, just a new calculation and a new result view.
