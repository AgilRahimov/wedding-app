# Roadmap & status

*The project plan: what problem this solves, what is built, what is deferred, what was
decided and why, and what is waiting on Agil. Update this file whenever a phase lands
or a decision is made — it is the single source of truth for project status.*
*(Last updated: 28 August 2026 — 8 weeks before the wedding. The site is LIVE.)*

## The problem

The guest list for Agil & Samra's wedding (23 October 2026, 19:00, Buta Palace, Baku)
lived in one Excel sheet: 234 invited parties / ~387 people in hand-drawn blocks, tallied
by fragile formulas. It could not track RSVPs, phone numbers, seating, or travel — and
only one person could edit it. On top of that, **guests do not all have the same day**:
some gather at the groom's house and travel in convoy, some come straight to the venue,
and guests flying in need their whole visit planned. International guests especially
need to know exactly what to expect.

## How the pieces fit

One database of parties and people; everything else is a view of it.

```mermaid
flowchart LR
    DB[(Guest database\nparties, people, RSVPs,\nseats, programmes, travel)]
    A[Family screens\nDashboard · Guests · Seating\nProgrammes · Settings] -->|edit| DB
    DB -->|read| H[Public homepage /]
    DB -->|read| I["Personal invitation\n/invite/(token)"]
    I -->|guest RSVPs, names +1s,\nadds children, flight info| DB
```

A party's single record carries its RSVP, table, programme and travel — so the family
edits in one place and the guest's page updates instantly.

## Build phases

| Phase | What | Status |
|---|---|---|
| 0 | Import the spreadsheet (234 parties / 386 seats, zero lost) | ✅ done 8 Aug |
| 1 | Guest list + RSVP: dashboard, guests screen, settings, invite links | ✅ done 8 Aug |
| 2 | Programmes (per-group day plans A/B/C), seating floor plan, public homepage | ✅ done 17–23 Aug |
| 2.5 | Hardening: git + GitHub, 10-test smoke suite, refactor, moved out of iCloud | ✅ done 23 Aug |
| 3 | Deployment — live at wedding-app-mu-ten.vercel.app (Vercel + Neon Postgres, both in Frankfurt); deploys automatically on every `git push` | ✅ done 28 Aug |
| 3.5 | Real Buta Palace floor plan: the venue's actual 40-table room (504 seats) drawn as an interactive map with per-seat dots, party-first seating queue, squeeze-in extra chairs, zoom/pan for iPads | ✅ done 28 Aug |
| 4 | **Travel/hotels module** — hotel list, room assignments, arrivals/departures board, transfer grouping; feeds Group C invitations | 🔜 next build |
| 5 | Activities — trips for out-of-town guests, sign-up via invite link | ⏳ after travel |

## Family to-do (the app is waiting on these)

| Task | Where | Status |
|---|---|---|
| Confirm the RSVP deadline (currently my placeholder: **1 October**) | Settings | ❗ unconfirmed |
| Rename the imported "Section NN" blocks to real names | Guests → Groups | 17 of 31 still auto-named |
| Assign parties to programmes A/B/C | Guests → tick + "Move to programme" | 232 of 234 still on default B |
| Add phone numbers (needed to send WhatsApp invites) | Guests | 1 of 234 |
| Mark bride's / groom's side per party (optional, helps seating) | Guests | 0 set |
| Replace remaining placeholder text (venue address detail, map link, welcome text) | Settings | partially placeholder |
| Ask Buta Palace whether they have official table numbers — if yes, adopt theirs before place cards are printed (5-minute change) | — | ❗ ask the venue |
| **Change the admin password** (still the seed default) | live site → Settings | ❗ urgent — site is public now |
| Re-add Ilya Briskman's +1 (his wife) on the live site | Guests → open party → Add member | 1 minute |
| Seat the room (now on the real floor plan) | Seating | 0 of 387 |
| Send invitations (WhatsApp, per party) | Guests → Copy invite | waits for travel module |

## Decisions made (and why)

- **One app, one database** — not separate tools per concern; the whole value is seeing a
  party's RSVP + seat + programme + travel in one place. *(early Aug)*
- **A party = one invite link; no guest accounts.** Nobody's grandmother registers. *(8 Aug)*
- **Guests self-serve**: RSVP, name their +1s, add children, send flight details. *(8 Aug)*
- **Programmes**: each party is on exactly one version of the day and sees only that. *(23 Aug)*
- **Seating is plan-first**: seat anyone regardless of reply; reconcile near the deadline
  ("Free their seats" flow). The family knows who is coming; RSVPs are confirmation. *(23 Aug)*
- **Travel lives on the party, not the person** — families travel together; exceptions go
  in notes. *(17 Aug)*
- **Invites delivered by hand over WhatsApp** — no email infrastructure. *(8 Aug)*
- **Hosting: Vercel + managed Postgres**, paid tiers fine ($20–50/mo). *(8 Aug; reaffirmed
  over Azure 23 Aug — "prefer Vercel instead of spending time configuring azure")*
- **Deploy before the travel module** so the family can do data entry from their phones. *(23 Aug)*
- **Test data cleared at the Postgres migration** — production starts from the clean
  spreadsheet import, plus Ilya Briskman's +1 (his wife), Agil's one real edit. *(23 Aug)*
- **The seating map is the venue's real room** (from Buta Palace's floor plan): 28 round
  ×12 + 8 half-round ×12 along the runway + 4 corner ovals ×18 = 504 seats. Numbering is
  ours — 1–8 runway, 9–22 left block, 23–36 right block, 37–40 ovals — until the venue
  says it has official numbers. Agil & Samra sit on the platform at the runway's end (it
  is drawn on the map, not a bookable table). Tables can be stretched to 13/14 seats from
  the table panel; extra chairs show in amber. A database that already has seated guests
  never gets its layout swapped by the seed. *(28 Aug)*
- **Local-first working mode**: the live site stays up (homepage for guests is enough
  for now); development and data entry happen on the laptop until things are stable.
  The whole database moves between laptop and live via Settings → "Download full
  backup" / "Restore from a backup file" — enter data on one side at a time. *(29 Aug)*
- **Groups are managed on the Guests screen**: + New group, rename, delete (parties
  fall back to "Ungrouped"), and a bulk "Move to group" for ticked parties. Azerbaijani
  letters (Ə, Ü, Ş, Ç, Ğ, İ…) verified working in names, groups, search and the guest
  pages. *(29 Aug)*
- **The Guests screen has a Boxes view** (one box per group, like the spreadsheet's
  blocks) for arranging groups on an iPad — Agil's father's way of working with the
  list. Boxes drag into a saved order; each box shows its people count, renames in
  place (✎) and adds parties straight into the group; a party opens in a dialog with
  "Move to Ungrouped" (stays invited) clearly separated from "Delete party" (gone).
  "Ungrouped" is always the wide box at the bottom. Excel is demoted to a print-only
  export: the JSON backup is the real data safety net, and all editing happens in the
  app. *(29 Aug)*
- **The laptop is now the real-data side** (Agil restored the live backup locally on
  29 Aug — 244 parties / 401 people incl. the family's online edits). The live site
  serves the homepage; its database is stale until the next backup → restore upward.
- **Parties order by hand inside their group** (drag on the Boxes view; stored as
  `Household.sortOrder`, ties fall back to A→Z), and a **printable report** at `/print`:
  sheet 1 dashboard + groups overview, then the groups in the family's box order in
  large type (~13pt, declined struck through, named companions beneath the party),
  then the still-to-seat list on its own sheet. *(29 Aug)*
- **Roles, history and roll-back** *(29 Aug)*: Agil's account is the **owner** — the
  only one who sees Settings (wedding details, sign-ins, backups, roll-back); everyone
  else is an **editor** (edits guests/seating/programmes, sees History). Every change —
  including guests' own replies — writes a line to the **History** page. The first
  change of each day stores a full **snapshot** (last 14 kept); the owner can roll the
  whole database back to any of them from Settings. Per-action undo was deliberately
  skipped (complexity ≫ value); History + roll-back is the chosen combination. The
  Guests screen now opens in the **Boxes view** by default.
- **English-only guest pages** for now. *(8 Aug)*
- **Boring tech, no black box** (Agil's standing requirement): Next.js + Prisma + SQLite
  → Postgres, minimal dependencies, README as owner's manual, tests as the safety net. 
- **Guest data never goes to GitHub** — code in the repo; database on the laptop plus
  dated backups (one copy in iCloud). *(23 Aug)*

## Deliberately set aside

- Email sending / bulk messaging (WhatsApp by hand is the plan)
- Azerbaijani/Russian translations of the guest pages
- Photo galleries, gift registries
- Per-person travel itineraries (party-level is enough)
- Roles/permissions among family admins (everyone equal)

## Open questions for Agil

1. RSVP deadline — is 1 October right?
2. Bride's side: is Samra's family's list coming into this same app, and who from her
   side gets a family login?
3. Hotels: which ones will we actually offer to Group C guests?
4. Transfers: private drivers, a minibus, or case-by-case?
5. When do invitations go out? (Deployment must land first; working back from the RSVP
   deadline, realistically early–mid September.)
