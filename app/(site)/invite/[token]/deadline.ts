// Shared by the invite page (to hide the form) and the RSVP action (to enforce).
export function rsvpIsClosed(deadline: string): boolean {
  if (!deadline.trim()) return false;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return false; // deadline written as free text — don't enforce
  // Closes at the end of the deadline day.
  return Date.now() > d.getTime() + 24 * 60 * 60 * 1000;
}
