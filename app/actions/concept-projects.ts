"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { conceptProjectChats, conceptProjects } from "@/drizzle/schema";
import {
  CONCEPT_PROJECT_OPENING_MESSAGE,
  type ConceptProjectStage,
} from "@/lib/concept-project/shared";
import { getDb } from "@/lib/db";
import { appendConceptProjectChatMessage } from "@/lib/concept-project/server";
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
      currentStage: "what" satisfies ConceptProjectStage,
      id: conceptProjectId,
      userOwner: viewer.id,
    });

    await tx.insert(conceptProjectChats).values({
      conceptProjectId,
      id: chatId,
    });

    await appendConceptProjectChatMessage(tx, {
      chatId,
      id: randomUUID(),
      message: CONCEPT_PROJECT_OPENING_MESSAGE,
      stage: "what",
      type: "agent",
    });
  });

  redirect(`/concept-project/${conceptProjectId}`);
}
