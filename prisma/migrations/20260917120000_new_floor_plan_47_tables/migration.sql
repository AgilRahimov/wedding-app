-- The venue sent a new floor plan (September 2026): 47 tables, 588 seats,
-- for a guest list heading towards 600. The old 40-table room is cleared
-- here, and the seed that runs right after the migrations on every build
-- recreates the current plan from lib/room-layout.ts (single source of
-- truth). No group had a table yet — 1 group = 1 table only just landed —
-- so nothing is lost; any tables the family added or dragged on the old
-- room are superseded by the venue's plan.
DELETE FROM "SeatTable";
