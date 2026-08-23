# Wedding HQ — orientation for a fresh session

Agil & Semra's wedding: **23 October 2026, 19:00, Buta Palace, Baku.**
This app manages the guest list (234 parties / ~387 people), RSVPs via personal
invite links, seating on a floor plan, and per-group day programmes.

**Read `README.md` (how it works) and `ROADMAP.md` (status, decisions, what's next)
before changing anything — and keep ROADMAP.md updated as work lands.** The owner, Agil, is
not a programmer: plan before building, ask before deciding product questions,
keep the code boring and explicit (his standing requirement: "no black box").

Working rules for this repo:
- `npm test` after changes — 10 Playwright smoke tests, ~30s, own test DB.
- `prisma/dev.db` is the real guest data. Never commit it; `npm run backup`
  snapshots it. Real RSVPs may exist — treat the data as live.
- Commit in small labelled steps; Agil pushes to GitHub with `git push`.
- Guest-facing pages live under `app/(site)/` (dark/gold theme, CSS vars in
  its layout); family screens under `app/(admin)/` (shared styles in
  `components/ui.tsx`).

Next planned work: the travel/hotels module (hotels, room assignments,
arrivals board, transfers), then activities, then deployment to Vercel +
Postgres.

@AGENTS.md
