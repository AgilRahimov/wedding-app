-- The floor-plan canvas widened from 700 to 800 units (extra side room for
-- tables beyond the venue's stock seats), with the existing layout centred.
-- Table x positions are stored as percentages of the canvas, so every stored
-- position is remapped to keep its exact absolute spot in the room:
--   old pixels = x% * 700 / 100, new x% = (old pixels + 50) / 800 * 100
UPDATE "SeatTable" SET "x" = ("x" * 7.0 + 50.0) / 8.0;
