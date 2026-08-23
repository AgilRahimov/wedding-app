/**
 * The admin screens' shared look, in one place. These are deliberately plain
 * exported class strings (not wrapper components) so every usage stays a
 * normal <input>/<button> that any developer can restyle inline when needed.
 */

export const inputCls =
  "rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-900 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-200";

const btnBase = "rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50";
export const btnPrimary = `${btnBase} bg-rose-700 text-white hover:bg-rose-800`;
export const btnGhost = `${btnBase} border border-stone-300 text-stone-600 hover:bg-stone-100`;

/** Pill colors for a member's reply status, keyed by the rsvp value. */
export const rsvpPill: Record<string, string> = {
  yes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  no: "bg-rose-50 text-rose-700 border-rose-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

/** A small coloured dot standing in for a reply, where a pill is too big. */
export function RsvpDot({ rsvp }: { rsvp: string }) {
  const tone =
    rsvp === "yes" ? "bg-emerald-500" : rsvp === "no" ? "bg-rose-500" : "bg-amber-400";
  const label =
    rsvp === "yes" ? "Coming" : rsvp === "no" ? "Has declined" : "Awaiting reply";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${tone}`}
      title={label}
      aria-label={label}
    />
  );
}

/** Success/error banner under forms. */
export function Feedback({ error, ok }: { error?: string; ok?: string }) {
  if (error)
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
    );
  if (ok)
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</p>
    );
  return null;
}
