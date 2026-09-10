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
5. Run **New query** again and, one at a time, paste in and run each of:
   - `supabase-today-page.sql` — poll voting table
   - `supabase-today-page-v2.sql` — lets a visitor change or remove their poll vote
   - `supabase-today-media-bucket.sql` — storage for direct image/video uploads on Today's Page
   - `supabase-community-submissions.sql` — community-submitted situations + their optional photo uploads
   - `supabase-feedback.sql` — the feedback system
   - `supabase-analytics.sql` — the analytics event-tracking foundation
   - `supabase-analytics-v2.sql` — fixes visitor/session counting (run this even if you already ran the first analytics file)
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

Open the URL it prints (usually `http://localhost:5173`). Go to `/admin` on
that local address (e.g. `http://localhost:5173/admin`), sign in with the
account you created, then click **"Initialize content in Supabase"** — this
pushes the starter quiz (11 situations, 5 personalities) into your database.
From then on, everything you edit in Admin is saved there.

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
   they are. (`vercel.json` is already included in this project and handles
   direct-URL routing like `/admin` correctly — nothing to configure.)
4. Before deploying, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your Project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon public key
5. Click **Deploy**. In about a minute you'll get a live link like
   `evrion.vercel.app` — that's your real, public, shareable EVRION website.

If you skipped the local step above, go to `/admin` on your live site (e.g.
`https://your-site.vercel.app/admin`), sign in, and click
**"Initialize content in Supabase"** once to load the starter quiz.

---

## Today's Page (V1.1)

Today's Page is EVRION's content-driven daily front page, and **every post on
it is fully independent** — its own id, date, content, status, and timestamps.
Publishing, unpublishing, editing, previewing, or deleting one post never
touches any other post, even ones on the same date. There is no shared
"day status" anymore.

From Admin → **Today's Page**:

- Pick a date to manage that date's posts.
- **+** adds a new post (Text, Image, Video, Poll, Situation, Announcement/Feature, or Button/Link). A new post isn't saved until you tap either **Save as draft** or **Publish now** in its editor.
- Each existing post has its own row with its own **Preview**, **Edit**, **Publish/Unpublish**, and **Delete** — and its own **Draft**/**Live** status shown right on the row.
- Reorder posts within a date with the up/down arrows.
- **Preview** always shows that one post exactly as the public page will render it — it never changes its status, so previewing a draft can never accidentally make it live.

The public "🗓 Today's Page" link shows only posts whose individual status is
**Live**, for today's date, in the order you set. If nothing is published for
today specifically, it falls back to the most recent date that has any live
posts, with a small note showing which date is being shown, rather than
displaying a blank page.

**Media uploads:** Image and Video posts let you upload a file straight from
your device (phone gallery or desktop file picker) — you'll see a preview
before saving. Pasting a URL instead is still supported as an alternative.
Uploaded files are stored in a Supabase Storage bucket called `today-media`
(set up by `supabase-today-media-bucket.sql`) — publicly viewable, but only
your logged-in admin session can upload to it.

**Polls:** Voting is anonymous (no login) but tied to a random per-browser id
stored on the visitor's device, so they can change their mind or remove their
vote entirely — their vote gets updated in place rather than stacking up as
extra votes.

Adding a new post type later means adding one entry to `TODAY_BLOCK_TYPES`,
one case in `defaultBlockData`, one render case in `TodayBlockPublic`, and one
form section in `TodayBlockEditModal` — nothing about how posts are stored,
published, or displayed needs to change.

## Community-submitted situations (V1.1)

Anyone can tap **✍️ Submit a situation** on the home screen and contribute a
title, scenario, and a few answer options (with an optional photo) — but
nothing they submit ever becomes public on its own. Every submission is its
own independent record with its own status: **Pending**, **Approved**, or
**Rejected**.

From Admin → **Community**:

- Submissions are grouped into Pending / Approved / Rejected tabs.
- Each one has its own **Preview**, **Edit**, **Approve**, **Reject**, and **Delete** — acting on one never touches any other.
- **Edit** lets you clean up a submission before approving it — the edited version is what gets approved, not the original.

Approving a submission doesn't publish anything by itself. It just makes that
situation available for you to actually use — right now, that means Today's
Page's "Add a post" screen has an **"Import from an approved community
submission"** option, which pre-fills a new (still-draft) Situation post from
it. You still explicitly save/publish it like any other post — nothing goes
live automatically just because it was approved.

This is intentionally just the foundation: no profiles, voting, likes, or
credited authorship yet — the data model (one independent record per
submission, in its own table) is built so those can be layered on later
without changing how existing submissions are stored.

## Feedback system (V1.1)

A small gold 💬 button floats in the corner on every public screen (not shown
while you're in Admin) — tapping it opens a quick form: pick a type (Bug,
Suggestion, Complaint, Liked something, General), write a message, optionally
rate EVRION 1–10, and send. It confirms receipt without promising a fix, and
automatically records which screen it was submitted from and basic device
info — no extra typing required from the person giving feedback, and nothing
invasive collected.

From Admin → **Feedback**:

- Filter by type, status, rating, or exact date, plus a free-text search over feedback messages.
- Each item has its own status — **New**, **Reviewing**, **Resolved**, or **Dismissed** — changed independently of every other item.
- **View** shows the full message plus its context (page, timestamp, device) in one place.
- Delete removes exactly the one item you're looking at.

Feedback is deliberately a separate table and separate admin section from
Community Situations — one is product feedback, the other is content people
want to contribute — even though both follow the same "many independent
records, not one shared status" shape under the hood.

## Analytics — the counting fix (V1.1)

An earlier version of this feature had a real gap: sessions were tied to
tab lifetime with no actual inactivity timeout, and there was no reliable
way to stop an accidental duplicate insert from ever creating a second row
for the same real action. Neither of those is true anymore — this section
documents the corrected, precise rules, since analytics is worthless if the
numbers can't be trusted.

**Four distinct, never-conflated concepts:**

- **Unique Visitors** — a random anonymous id stored in the visitor's own
  browser (localStorage), created once and never regenerated. Refreshing,
  navigating anywhere in EVRION, closing and reopening the browser, or
  coming back days later — none of that creates a new visitor. The count
  shown is the number of *distinct* visitor ids seen in the selected range.
- **Sessions** — a period of continuous activity. A session ends only after
  **30 minutes of inactivity**, not when a tab closes and not on
  navigation. Moving between the quiz, Today's Page, and back stays the
  same session throughout. The count shown is the number of *distinct*
  session ids in the selected range.
- **Page Views** — fired only on genuine top-level screen navigation (home
  → categories → quiz → result, etc.). Answering another quiz question,
  a component re-rendering, or an internal state change never counts as a
  page view — the quiz stays one page view for its entire duration,
  regardless of how many questions get answered inside it.
- **Events** — specific product interactions (`quiz_started`,
  `situation_played`, `feedback_submitted`, and so on) that can legitimately
  happen many times in a single session without implying a new visitor or a
  new session. The dashboard's "Events" number is the total count of these,
  kept clearly separate from Page Views and Visitors so the two can never
  be confused for each other.

**Duplicate protection:** every recorded row gets a deterministic id built
from the session, the event type, and (where relevant) what makes it a
distinct occurrence — a category, a question, a short hash of submitted
text — bucketed into a 2-second window. Two accidental fires of the exact
same action within that window collapse into a single database row (the
database itself refuses the second insert); two genuinely different
actions, even seconds apart, are always counted separately.

**Today's Page specifically:** the dashboard now shows both **Page views**
(every genuine visit, including repeats from the same person) and **Unique
visitors** (distinct people) side by side, so "I opened it five times" and
"five different people opened it" are never presented as the same number.

**If you tested the old version:** your `analytics_events` table may
already contain contaminated numbers from before this fix. `supabase-
analytics-v2.sql` has a commented-out `truncate table analytics_events;` —
uncomment and run it yourself if you want a clean slate; nothing is wiped
automatically.

## Analytics (V1.1)

Admin → **Analytics** is a small, honest dashboard — not a full analytics
platform. Pick a range (Today / Last 7 days / Last 30 days / All time) and
it shows: total page views, unique visitors, sessions, quiz starts and
completions with a completion rate, Today's Page views, and community
submissions — followed by new-vs-returning visitors, the most-played
situations, Today's Page's most-viewed posts, Community's current
pending/approved/rejected totals, and Feedback broken down by type with an
average rating.

Under the hood, EVRION records eight specific events as they actually
happen — `page_view`, `session_started`, `quiz_started`, `quiz_completed`,
`situation_played`, `today_page_viewed`, `community_submission`,
`feedback_submitted` — each with its own timestamp, into its own Supabase
table. Nothing on the dashboard is hardcoded or estimated; every number is
computed live from those real recorded events for whichever range you've
selected. Recording an event never blocks the app or shows an error if it
fails — analytics is a passenger, never load-bearing.

A visitor is identified only by a random, anonymous id stored in their own
browser (the same lightweight approach already used for poll votes) — good
enough to tell new visitors from returning ones and to avoid double-counting
a page refresh as a new session, without adding any real account system.
Device info recorded with feedback is just the browser's own user-agent
string — nothing more identifying is collected anywhere in this system.

Adding a new metric later mostly means adding one more small aggregation
over the existing event log — the event vocabulary and table are built to
be extended, not replaced.

## Critical bug fixes (V1.1)

Two things were fixed, and nothing else was touched:

1. **Today's Page could lose all content.** The "Initialize content in
   Supabase" button (shown when Admin couldn't confirm content had synced
   yet) overwrote the *entire* content record — every Today's Page post on
   every date, plus every question/category/personality — with fresh
   starter data, with no check for whether real content already existed.
   That banner can reappear from a plain transient load hiccup, not only a
   genuinely empty database, so clicking it at the wrong moment was
   destructive. It now re-checks Supabase immediately before doing
   anything; if content is actually there, it loads that instead and
   refuses to overwrite. The per-post data model itself (independent id,
   date, status, timestamps per post) was already correct — this was the
   one real hole in it.
2. **No safe way to exit an unfinished quiz.** Quiz screens now have an
   explicit close (✕) button, and the browser/device back action is
   intercepted while a quiz is active — both surface a "Leave quiz? Your
   progress will be lost." confirmation with Continue/Exit, rather than
   requiring you to step backward through every question or lose progress
   to an accidental back-swipe.

## Admin access (V1.1)

There is no "Admin" button or link anywhere in the public site — that's
intentional. Ordinary visitors have no way to discover it and no reason to
try logging in. Your access is a direct URL instead:

```
https://your-site.vercel.app/admin
```

Bookmark that once and you're set. Log in with the email/password you
created in Supabase Authentication, same as before — nothing about the login
itself changed.

**Want a less-guessable path?** Set `VITE_ADMIN_PATH` in your environment
variables (Vercel → Settings → Environment Variables, same place as your
Supabase keys) to something like `/evrion-owner`, then redeploy. Whatever you
choose, visit `https://your-site.vercel.app/whatever-you-set`.

**Being honest about what this does and doesn't protect against:** this
removes the *invitation* — nobody browsing EVRION will ever see a reason to
try admin access. It is not a secret in the cryptographic sense; the path
does end up in the JavaScript your browser downloads, so someone determined
enough to inspect it could still find it. That's true of any client-only app
and isn't something a hidden URL can fix. Your actual protection — the part
that matters if someone *does* find the URL — is unchanged and was already
correct: they'd hit a real login form requiring the one email/password you
created in Supabase, and the database itself (via the RLS policies in every
`.sql` file here) refuses any write from a session that isn't authenticated.
No admin secrets or privileged keys are ever shipped to the browser — only
the public anon key, which is designed to be public and is meaningless
without a real login for anything that writes data.

If you'd rather have a second layer beyond "the URL isn't advertised," the
next honest step up would be IP allowlisting or a Vercel-level password on
that one route — worth considering later if EVRION grows, not necessary now.

## Platform shell — Home, Play, Discover, Community, Profile (V1.1)

EVRION now presents itself as a platform, not a single quiz. A persistent
header and bottom tab bar (Home / Play / Discover / Community / Profile)
wrap five hub screens — this is the new outer shell around everything that
already existed, not a replacement for it.

**What's real vs. what's a placeholder, explicitly:**

- **Home** — genuinely functional. The hero's "Start the Vibe Check"
  launches the real quiz exactly as before; the situation cards are real
  seeded questions; "Today's Page" and "Got a situation?" open the real
  existing screens for those features.
- **Play** — the real quiz is here too (Play is the natural home for
  playable things), with a few clearly-labeled "Coming soon" tiles hinting
  at future game formats. Nothing here is fabricated as if it already works.
- **Discover** — entirely forward-looking placeholders (future categories,
  experiences, worldwide content) — no real functionality yet, and it
  doesn't pretend to have any.
- **Community** — real entry points to Today's Page and situation
  submissions, sitting alongside honest "Coming soon" placeholders for a
  future feed and challenges.
- **Profile** — EVRION has no visitor accounts yet, so this never fakes
  personal data (no invented streaks or names). It says plainly that
  accounts are coming and links to the one real thing available today:
  sending feedback.

**Nothing existing was removed or rebuilt.** The quiz, Today's Page,
Community Situations, Feedback, Analytics, and Admin all work exactly as
they did — this only changed *how you arrive at them*. Deep flows (taking
the quiz, viewing Today's Page, submitting a situation) still use their own
existing screens; the tab bar and header only wrap the five hub/browsing
screens, the same way most real apps separate "browsing" chrome from
"focused task" screens. Leaving one of those flows now returns you to
whichever tab you launched it from (e.g. opening Today's Page from
Community returns you to Community, not Home).

## Editing the quiz after launch

Everything is done from the **Admin** panel (see "Admin access" above for
the URL) — no redeploying needed:

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
