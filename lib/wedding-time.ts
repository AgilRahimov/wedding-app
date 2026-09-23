/**
 * The moment the wedding starts, as an exact instant. The date and time in
 * Settings are Baku wall-clock time (UTC+4, no daylight saving) — but the
 * server runs in UTC, so reading them "as local time" put the countdown four
 * hours late. Returns an ISO string, or null if the date cannot be read.
 */
export function weddingStartIso(weddingDate: string, time: string | null | undefined): string | null {
  const d = new Date(weddingDate);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const [h = "19", m = "00"] = (time || "19:00").split(":");
  const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(Number(h) || 0)}:${pad(Number(m) || 0)}:00+04:00`;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}
