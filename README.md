# Wedding HQ

Agil & Semra's wedding — **23 October 2026, 19:00, Buta Palace, Baku**.
This app replaces `Spisok v2.xlsx`.

**The family's side** (sign-in required):

- **Dashboard** — live totals: invited, coming, declined, awaiting reply.
- **Guests** — the full list (imported from the spreadsheet: 234 parties / 386 people),
  with search, filters, RSVP tracking, phone numbers, groups, Excel export, and travel
  details for anyone flying in. Tick several parties to move them all to a programme at once.
- **Seating** — a floor plan of the room. Click a guest, then click a table to seat them;
  "Move tables" lets you drag the plan into the real shape of the room.
  **Everyone can be seated straight away, replied or not** — the family plans the room
  from what it knows, and reconciles against the replies later (see below).
- **Programmes** — the different versions of the day. Not every guest has the same one:
  Group A gathers at the groom's house and travels in convoy, Group B comes straight to
  the venue, Group C is flying in and gets the whole visit. Each party is on one programme
  and sees only that timetable.
- **Settings** — the wedding details guests see, plus family sign-in accounts.

**The guests' side** (no sign-in):

- **Homepage** (`/`) — the public wedding site: countdown, the essentials, the evening,
  travel notes, and a box to open a personal invitation.
- **Personal invitation** (`/invite/<token>`) — one private link per party, sent by
  WhatsApp. Shows their table on the floor plan, their own programme, their travel
  details if they are coming from abroad, and their RSVP form.

**Project plan, phase statuses, decisions and open questions live in [ROADMAP.md](ROADMAP.md).**

## Running it

```bash
npm run dev
```

Then open http://localhost:3000 and sign in. The first admin account is
`agil_93@hotmail.com` (change the password in Settings if you haven't yet).

## Where things live

| Path | What it is |
|---|---|
| `prisma/schema.prisma` | The database structure, with comments. Change it → run `npx prisma migrate dev` |
| `prisma/dev.db` | **The database — all your data is this one file.** Back it up by copying it |
| `prisma/data/` | The original spreadsheet extraction (`guests.json`) and the script that made it |
| `app/login/` | Sign-in screen |
| `app/(admin)/dashboard/` | Dashboard screen |
| `app/(admin)/guests/` | Guests screen: `guests-screen` (list), `edit-panel`, `travel-fields`, `add-party-panel`, `groups-panel`, `actions.ts`, Excel export |
| `app/(admin)/seating/` | Seating screen: `seating-screen` (plan + queue), `table-panel`, `add-table-panel`, `actions.ts` |
| `app/(admin)/programmes/` | Programmes screen (the timetables) |
| `app/(admin)/settings/` | Settings screen (wedding details, family accounts) |
| `app/(site)/page.tsx` | The public wedding homepage |
| `app/(site)/invite/[token]/` | A guest's personal invitation + RSVP |
| `components/venue-map.tsx` | The floor plan, shared by the seating screen and guest pages |
| `components/ui.tsx` | The admin screens' shared styles (inputs, buttons, RSVP pills) |
| `lib/party.ts` | How a party travels from database to screen — types derived from the schema |
| `lib/db.ts`, `lib/session.ts` | Database client and login sessions |
| `tests/` | The smoke suite — `npm test` checks the whole app in ~30s on its own test database |

The family's screens are light and plain; the guest-facing pages under `app/(site)/`
have their own dark evening look, set once in `app/(site)/layout.tsx`.

Every screen folder contains its page, its components, and its `actions.ts`
(the functions that change data). Nothing important hides anywhere else.

## Common tasks

- **Back up the data** — `npm run backup` (copies the database into `backups/` with
  today's date). The guest data is deliberately NOT in git.
- **Check nothing is broken after a change** — `npm test`. Ten browser tests run against
  a scratch database in about half a minute. Green = the core flows all work.
- **Look at the raw data** — `npx prisma studio` opens a spreadsheet-like view of every table.
- **Add a family member who can sign in** — Settings → Family access.
- **Re-import the spreadsheet from scratch** — delete `prisma/dev.db`, then
  `npx prisma migrate dev`. (Only do this before real RSVPs start arriving —
  it wipes everything back to the spreadsheet state.)
- **Send an invite** — Guests → "Copy invite" on a party → paste into WhatsApp.
- **Get everything into Excel** — Guests → "Export Excel".
- **Put people on the right day plan** — Guests → filter or search, tick the parties,
  then "Move to programme". Everyone starts on Group B (straight to the venue).
- **Change what a group is told** — Programmes → open a programme → edit the steps.
  Changes show on those guests' invitations immediately.
- **Match the plan to the real room** — Seating → "Move tables", drag them, and they save
  themselves. The room starts as 35 tables (a top table of 8 plus 34 rounds of 10 =
  348 seats), laid out as five rows of six with a short row of four by the entrance.
  The stage, dance floor and entrance are a placeholder drawn in
  `components/venue-map.tsx`; we'll redraw them when Buta Palace sends the real plan.
- **Seat a whole family in one go** — Seating → click any one of them, then click the
  table: the panel offers "Seat all N of &lt;party&gt; here". Work through the list group by
  group using the group filter — that's how seating actually gets done.
- **Reconcile seating with the replies** (do this near the reply deadline) — Seating shows
  a banner whenever someone holding a seat has since declined, an amber dot on the tables
  affected, and a "Free their seats" button that clears them all at once. The header keeps
  a running count of how many seated people are confirmed, awaiting, or have declined.
- **Check what a guest actually sees** — Guests → open a party → "Preview their invitation".
- **Print a large-type A4 list for review on paper** — from the `wedding-app` folder:

  ```bash
  node scripts/export-print-data.js
  python3 scripts/print-guest-list.py scripts/print-data.json "../Guest list for review.pdf"
  ```

  (needs `pip3 install reportlab` once). Font sizes are the `NAME_SIZE` / `SUB_SIZE` /
  `HEAD_SIZE` numbers at the top of `scripts/print-guest-list.py`.

## Adding a new screen (travel, activities…)

Copy the pattern — every admin screen is a folder under `app/(admin)/` containing:

| File | Role |
|---|---|
| `page.tsx` | Server component: fetches from the database, passes plain data down |
| `<name>-screen.tsx` | `"use client"` component holding the screen's state and layout |
| `actions.ts` | `"use server"` functions that change data — every one starts with `requireAdminAction()` and ends with `revalidatePath(...)` |
| smaller `*.tsx` | Panels and pieces the screen imports — keep files under ~300 lines |

Style inputs and buttons with the constants from `components/ui.tsx`. Add the screen to
`app/(admin)/nav-links.tsx`, and give new database tables a commented model in
`prisma/schema.prisma` (then `npx prisma migrate dev`). Finish by adding one or two
smoke tests in `tests/`.

## Technology (for any developer who works on this later)

Deliberately boring and mainstream: Next.js (App Router) + TypeScript, Prisma ORM,
SQLite locally (Postgres when deployed), Tailwind CSS. Dependencies beyond that:
`bcryptjs` (password hashing), `jose` (login cookies), `exceljs` (Excel export).
No state-management library, no separate API server, no drag-and-drop library, no CSS
framework beyond Tailwind.

Data model in one sentence: a **Household** (= one invited party, one invite token)
has many **Guests** (each with their own RSVP and their own seat at a **SeatTable**), and
belongs to one **Programme** (which has ordered **ProgrammeItem** steps); travel fields
sit on the household because a family travels together. `Hotel` and `Activity` exist in
the schema, ready for the travel and activities modules.

Table positions on the floor plan are stored as percentages of the room (`x`, `y`), so
the same plan renders correctly on a phone and on a laptop.

## Version control

The code lives in git (`git log` shows the history); the guest data does not — it stays
in `prisma/dev.db`, which is git-ignored, plus dated copies in `backups/`. To push to
GitHub: create a private repo, then `git remote add origin <url> && git push -u origin main`.

## Deployment

Not deployed yet — currently runs locally only. The plan: GitHub repo → Vercel
(app hosting) + a managed Postgres database. Steps will be added here when we do it.
