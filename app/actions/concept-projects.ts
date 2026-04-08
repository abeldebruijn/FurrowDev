"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { conceptProjectChats, conceptProjects } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

export async function createConceptProject() {
  const session = await getWorkOSSession();

  if (!session) {
    redirect("/login");
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const db = getDb();
  const conceptProjectId = randomUUID();
  const chatId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(conceptProjects).values({
      id: conceptProjectId,
      userOwner: viewer.id,
    });

    await tx.insert(conceptProjectChats).values({
      conceptProjectId,
      id: chatId,
    });
  });

  redirect(`/concept-project/${conceptProjectId}`);
}
