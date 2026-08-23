import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "yes" | "no" | "pending";
}) {
  const tones = {
    default: "text-stone-900",
    yes: "text-emerald-700",
    no: "text-rose-700",
    pending: "text-amber-700",
  };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tracking-tight ${tones[tone]}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-stone-400">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const [
    households,
    guests,
    yes,
    no,
    pending,
    children,
    responded,
    opened,
    noPhone,
    byGroup,
  ] = await Promise.all([
    db.household.count(),
    db.guest.count(),
    db.guest.count({ where: { rsvp: "yes" } }),
    db.guest.count({ where: { rsvp: "no" } }),
    db.guest.count({ where: { rsvp: "pending" } }),
    db.guest.count({ where: { isChild: true } }),
    db.household.count({ where: { respondedAt: { not: null } } }),
    db.household.count({ where: { linkOpenedAt: { not: null } } }),
    db.household.count({ where: { OR: [{ phone: null }, { phone: "" }] } }),
    db.household.groupBy({
      by: ["group"],
      _count: { _all: true },
      orderBy: { _count: { group: "desc" } },
    }),
  ]);

  const answered = yes + no;
  const progress = guests === 0 ? 0 : Math.round((answered / guests) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-stone-500">
          {households} invited parties · {guests} people
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Invited" value={guests} sub={`${households} parties`} />
        <Stat label="Coming" value={yes} tone="yes" sub={children > 0 ? `incl. ${children} children` : undefined} />
        <Stat label="Not coming" value={no} tone="no" />
        <Stat label="Awaiting reply" value={pending} tone="pending" />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">RSVP progress</h2>
          <span className="text-sm text-stone-500">
            {answered} of {guests} answered · {progress}%
          </span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-stone-600 sm:grid-cols-3">
          <p>
            <span className="font-medium text-stone-900">{responded}</span>{" "}
            {responded === 1 ? "party" : "parties"} replied via their link
          </p>
          <p>
            <span className="font-medium text-stone-900">{opened}</span>{" "}
            {opened === 1 ? "party" : "parties"} opened their link
          </p>
          <p>
            <span className="font-medium text-stone-900">{noPhone}</span>{" "}
            {noPhone === 1 ? "party has" : "parties have"} no phone number
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Groups</h2>
          <Link href="/guests" className="text-sm text-rose-700 hover:underline">
            Open guest list →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
          {byGroup.map((g) => (
            <div key={g.group} className="flex justify-between gap-2 border-b border-stone-100 py-1">
              <span className="truncate text-stone-600">{g.group}</span>
              <span className="font-medium">{g._count._all}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Group sizes count parties, not people. Rename the &ldquo;Section&rdquo;
          groups on the Guests screen.
        </p>
      </div>
    </div>
  );
}
