import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { inputCls as input } from "@/components/ui";
import { saveEventInfo } from "./actions";
import { AdminsPanel } from "./admins-panel";

export const dynamic = "force-dynamic";


function Field({
  label,
  name,
  defaultValue,
  placeholder,
  textarea,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
      {label}
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={4}
          className={input}
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={input}
        />
      )}
    </label>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requireAdmin();
  const [info, admins, { saved }] = await Promise.all([
    db.eventInfo.findUniqueOrThrow({ where: { id: 1 } }),
    db.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    searchParams,
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-stone-500">
          What guests see on their invite page, and who in the family can sign in.
        </p>
      </div>

      {saved && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Wedding details saved.
        </p>
      )}

      <form
        action={saveEventInfo}
        className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
      >
        <h2 className="font-medium">Wedding details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Couple names"
            name="coupleNames"
            defaultValue={info.coupleNames}
            placeholder="Agil & …"
          />
          <Field
            label="Wedding date"
            name="weddingDate"
            defaultValue={info.weddingDate}
            placeholder="e.g. 12 September 2026"
          />
          <Field
            label="Ceremony time"
            name="ceremonyTime"
            defaultValue={info.ceremonyTime}
            placeholder="e.g. 17:00"
          />
          <Field
            label="RSVP deadline"
            name="rsvpDeadline"
            defaultValue={info.rsvpDeadline}
            placeholder="e.g. 1 August 2026"
          />
          <Field
            label="Venue name"
            name="venueName"
            defaultValue={info.venueName}
            placeholder="e.g. Buta Palace"
          />
          <Field
            label="Venue address"
            name="venueAddress"
            defaultValue={info.venueAddress}
          />
          <Field
            label="Map link"
            name="mapUrl"
            defaultValue={info.mapUrl}
            placeholder="Google Maps URL"
          />
          <Field
            label="Dress code"
            name="dressCode"
            defaultValue={info.dressCode}
            placeholder="e.g. Formal"
          />
          <Field
            label="Contact phone (for guest questions)"
            name="contactPhone"
            defaultValue={info.contactPhone}
          />
        </div>
        <Field
          label="Welcome text (top of the invite page)"
          name="welcomeText"
          defaultValue={info.welcomeText}
          textarea
        />
        <Field
          label="Schedule of the day (one item per line, e.g. “17:00 — Ceremony”)"
          name="schedule"
          defaultValue={info.schedule}
          textarea
        />
        <Field
          label="FAQ / useful info (one item per line, e.g. “Parking — free at the venue”)"
          name="faq"
          defaultValue={info.faq}
          textarea
        />
        <Field
          label="Homepage travel section (one card per line: “Title — text”; leave empty for the built-in cards)"
          name="travelInfo"
          defaultValue={info.travelInfo}
          textarea
        />
        <div>
          <button className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800">
            Save wedding details
          </button>
        </div>
      </form>

      <AdminsPanel
        admins={admins.map((a) => ({ id: a.id, name: a.name, email: a.email }))}
        selfId={session.adminId}
      />
    </div>
  );
}
