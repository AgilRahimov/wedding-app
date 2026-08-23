import type { Guest, Household } from "@prisma/client";

/**
 * The one place that knows how a party travels from the database to the
 * admin screens. The types are DERIVED from the Prisma models, so when a
 * field is added to the schema it flows through here automatically —
 * this file only names what the screens receive and how dates become
 * strings on the way.
 */

export type MemberView = Pick<
  Guest,
  "id" | "name" | "rsvp" | "isChild" | "age" | "isPlusOne"
>;

export type PartyView = Pick<
  Household,
  | "id"
  | "token"
  | "name"
  | "group"
  | "side"
  | "phone"
  | "notes"
  | "rsvpNote"
  | "programmeId"
  | "isInternational"
  | "arrivalDate"
  | "arrivalDetails"
  | "departureDate"
  | "departureDetails"
  | "needsTransfer"
  | "roomDetails"
  | "travelNotes"
> & {
  linkOpenedAt: string | null; // ISO strings — Dates don't serialise to the client
  respondedAt: string | null;
  members: MemberView[];
};

export type ProgrammeOption = { id: string; code: string; name: string };

export function toPartyView(h: Household & { guests: Guest[] }): PartyView {
  return {
    id: h.id,
    token: h.token,
    name: h.name,
    group: h.group,
    side: h.side,
    phone: h.phone,
    notes: h.notes,
    rsvpNote: h.rsvpNote,
    programmeId: h.programmeId,
    isInternational: h.isInternational,
    arrivalDate: h.arrivalDate,
    arrivalDetails: h.arrivalDetails,
    departureDate: h.departureDate,
    departureDetails: h.departureDetails,
    needsTransfer: h.needsTransfer,
    roomDetails: h.roomDetails,
    travelNotes: h.travelNotes,
    linkOpenedAt: h.linkOpenedAt?.toISOString() ?? null,
    respondedAt: h.respondedAt?.toISOString() ?? null,
    members: h.guests.map((g) => ({
      id: g.id,
      name: g.name,
      rsvp: g.rsvp,
      isChild: g.isChild,
      age: g.age,
      isPlusOne: g.isPlusOne,
    })),
  };
}
