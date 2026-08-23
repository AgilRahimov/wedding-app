"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/session";

export type ItemDraft = {
  id: string; // existing id, or "new-…" for a line added in the editor
  time: string;
  title: string;
  detail: string;
  location: string;
};

function refresh() {
  revalidatePath("/programmes");
  revalidatePath("/guests");
}

export async function saveProgramme(
  programmeId: string,
  values: { name: string; title: string; summary: string },
  items: ItemDraft[]
) {
  await requireAdminAction();
  if (!values.name.trim()) throw new Error("The programme needs a name");

  const clean = items
    .map((i) => ({ ...i, title: i.title.trim(), time: i.time.trim() }))
    .filter((i) => i.title !== "" || i.time !== "");

  await db.$transaction(async (tx) => {
    await tx.programme.update({
      where: { id: programmeId },
      data: {
        name: values.name.trim(),
        title: values.title.trim(),
        summary: values.summary.trim() || null,
      },
    });

    const keep = clean.filter((i) => !i.id.startsWith("new-")).map((i) => i.id);
    await tx.programmeItem.deleteMany({
      where: { programmeId, id: { notIn: keep } },
    });

    for (const [index, item] of clean.entries()) {
      const data = {
        time: item.time,
        title: item.title,
        detail: item.detail.trim() || null,
        location: item.location.trim() || null,
        sortOrder: index,
      };
      if (item.id.startsWith("new-")) {
        await tx.programmeItem.create({ data: { ...data, programmeId } });
      } else {
        // Scoped by programmeId so one programme's save can never edit another's.
        await tx.programmeItem.update({
          where: { id: item.id, programmeId },
          data,
        });
      }
    }
  });

  refresh();
}

export async function addProgramme(code: string, name: string, title: string) {
  await requireAdminAction();
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) throw new Error("Give the programme a short code, like D");
  if (await db.programme.findUnique({ where: { code: trimmed } }))
    throw new Error(`Programme ${trimmed} already exists`);

  const count = await db.programme.count();
  await db.programme.create({
    data: {
      code: trimmed,
      name: name.trim() || `Group ${trimmed}`,
      title: title.trim() || "A new version of the day",
      sortOrder: count,
    },
  });
  refresh();
}

export async function deleteProgramme(programmeId: string) {
  await requireAdminAction();
  const fallback = await db.programme.findFirst({
    where: { isDefault: true, NOT: { id: programmeId } },
  });
  if (!fallback)
    throw new Error("Set another programme as the default before deleting this one");

  // Move its parties onto the default rather than leaving them with no day plan.
  await db.household.updateMany({
    where: { programmeId },
    data: { programmeId: fallback.id },
  });
  await db.programme.delete({ where: { id: programmeId } });
  refresh();
}

/** The programme new parties get, and the fallback when one is deleted. */
export async function setDefaultProgramme(programmeId: string) {
  await requireAdminAction();
  await db.$transaction([
    db.programme.updateMany({ data: { isDefault: false } }),
    db.programme.update({ where: { id: programmeId }, data: { isDefault: true } }),
  ]);
  refresh();
}
