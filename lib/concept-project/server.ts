import { randomUUID } from "node:crypto";

import { and, eq, max, or } from "drizzle-orm";

import {
  conceptProjectChatMessages,
  conceptProjectChats,
  conceptProjects,
  organisations,
  roadmapItems,
  roadmaps,
  users,
} from "@/drizzle/schema";
import { getDb, type Database } from "@/lib/db";
import {
  type ConceptProjectChatAuthor,
  type ConceptProjectRoadmapDraftItem,
  type ConceptProjectStage,
  CONCEPT_PROJECT_OPENING_MESSAGE,
  getNextConceptProjectStage,
} from "@/lib/concept-project/shared";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type AccessibleConceptProject = {
  chatId: string;
  currentStage: ConceptProjectStage;
  description: string | null;
  forWhomSummary: string | null;
  howSummary: string | null;
  id: string;
  name: string | null;
  roadmapId: string | null;
  understoodForWhomAt: Date | null;
  understoodHowAt: Date | null;
  understoodWhatAt: Date | null;
  whatSummary: string | null;
};

export type ConceptProjectTranscriptMessage = Awaited<
  ReturnType<typeof getConceptProjectTranscript>
>[number];

export type ConceptProjectRoadmapItem = Awaited<
  ReturnType<typeof getConceptProjectRoadmapItems>
>[number];

type AppendConceptProjectChatMessageArgs = {
  chatId: string;
  id?: string;
  message: string;
  stage: ConceptProjectStage;
  type: ConceptProjectChatAuthor;
  userId?: string;
};

type ApplyConceptProjectStageUnderstandingArgs = {
  chatId: string;
  conceptProjectId: string;
  description: string;
  handoffMessage: string;
  name: string;
  roadmapItems: ConceptProjectRoadmapDraftItem[];
  stage: Exclude<ConceptProjectStage, "setup">;
  summary: string;
};

function getSummaryColumn(stage: Exclude<ConceptProjectStage, "setup">) {
  switch (stage) {
    case "what":
      return "whatSummary";
    case "for_whom":
      return "forWhomSummary";
    case "how":
      return "howSummary";
  }
}

function getTimestampColumn(stage: Exclude<ConceptProjectStage, "setup">) {
  switch (stage) {
    case "what":
      return "understoodWhatAt";
    case "for_whom":
      return "understoodForWhomAt";
    case "how":
      return "understoodHowAt";
  }
}

export async function getAccessibleConceptProject(
  viewerId: string,
  conceptProjectId: string,
  db: Database = getDb(),
) {
  const rows = await db
    .select({
      chatId: conceptProjectChats.id,
      currentStage: conceptProjects.currentStage,
      description: conceptProjects.description,
      forWhomSummary: conceptProjects.forWhomSummary,
      howSummary: conceptProjects.howSummary,
      id: conceptProjects.id,
      name: conceptProjects.name,
      roadmapId: conceptProjects.roadmapId,
      understoodForWhomAt: conceptProjects.understoodForWhomAt,
      understoodHowAt: conceptProjects.understoodHowAt,
      understoodWhatAt: conceptProjects.understoodWhatAt,
      whatSummary: conceptProjects.whatSummary,
    })
    .from(conceptProjects)
    .innerJoin(conceptProjectChats, eq(conceptProjectChats.conceptProjectId, conceptProjects.id))
    .leftJoin(organisations, eq(conceptProjects.orgOwner, organisations.id))
    .where(
      and(
        eq(conceptProjects.id, conceptProjectId),
        or(eq(conceptProjects.userOwner, viewerId), eq(organisations.ownerId, viewerId)),
      ),
    )
    .limit(1);

  return (rows[0] ?? null) as AccessibleConceptProject | null;
}

export async function getConceptProjectViewerName(viewerId: string, db: Database = getDb()) {
  const rows = await db
    .select({
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, viewerId))
    .limit(1);

  return rows[0]?.name?.trim() || "User";
}

export async function getConceptProjectTranscript(
  conceptProjectId: string,
  db: Database = getDb(),
) {
  return db
    .select({
      id: conceptProjectChatMessages.id,
      message: conceptProjectChatMessages.message,
      order: conceptProjectChatMessages.order,
      stage: conceptProjectChatMessages.stage,
      type: conceptProjectChatMessages.type,
    })
    .from(conceptProjectChatMessages)
    .innerJoin(
      conceptProjectChats,
      eq(conceptProjectChatMessages.conceptProjectChatId, conceptProjectChats.id),
    )
    .where(eq(conceptProjectChats.conceptProjectId, conceptProjectId))
    .orderBy(conceptProjectChatMessages.order);
}

export async function ensureConceptProjectOpeningMessage(
  conceptProject: Pick<AccessibleConceptProject, "chatId" | "currentStage" | "id">,
  db: Database = getDb(),
) {
  if (conceptProject.currentStage !== "what") {
    return;
  }

  const transcript = await getConceptProjectTranscript(conceptProject.id, db);

  if (transcript.length > 0) {
    return;
  }

  await db.transaction(async (tx) => {
    await appendConceptProjectChatMessage(tx, {
      chatId: conceptProject.chatId,
      message: CONCEPT_PROJECT_OPENING_MESSAGE,
      stage: "what",
      type: "agent",
    });
  });
}

export async function getConceptProjectRoadmapItems(
  roadmapId: string | null,
  db: Database = getDb(),
) {
  if (!roadmapId) {
    return [];
  }

  return db
    .select({
      description: roadmapItems.description,
      id: roadmapItems.id,
      majorVersion: roadmapItems.majorVersion,
      minorVersion: roadmapItems.minorVersion,
      name: roadmapItems.name,
    })
    .from(roadmapItems)
    .where(eq(roadmapItems.roadmapId, roadmapId))
    .orderBy(roadmapItems.majorVersion, roadmapItems.minorVersion, roadmapItems.name);
}

async function getNextConceptProjectChatOrder(tx: Transaction, chatId: string) {
  const rows = await tx
    .select({
      order: max(conceptProjectChatMessages.order),
    })
    .from(conceptProjectChatMessages)
    .where(eq(conceptProjectChatMessages.conceptProjectChatId, chatId));

  return (rows[0]?.order ?? -1) + 1;
}

export async function appendConceptProjectChatMessage(
  tx: Transaction,
  { chatId, id = randomUUID(), message, stage, type, userId }: AppendConceptProjectChatMessageArgs,
) {
  const nextOrder = await getNextConceptProjectChatOrder(tx, chatId);

  await tx.insert(conceptProjectChatMessages).values({
    conceptProjectChatId: chatId,
    id,
    message,
    order: nextOrder,
    stage,
    type,
    userId: type === "person" ? userId : null,
  });

  return id;
}

export async function ensureConceptProjectRoadmap(
  tx: Transaction,
  conceptProjectId: string,
  roadmapId: string | null,
) {
  if (roadmapId) {
    return roadmapId;
  }

  const nextRoadmapId = randomUUID();

  await tx.insert(roadmaps).values({
    currentMajor: 0,
    currentMinor: 0,
    id: nextRoadmapId,
  });

  await tx
    .update(conceptProjects)
    .set({
      roadmapId: nextRoadmapId,
    })
    .where(eq(conceptProjects.id, conceptProjectId));

  return nextRoadmapId;
}

export async function replaceConceptProjectRoadmapItems(
  tx: Transaction,
  {
    conceptProjectId,
    items,
    roadmapId,
  }: {
    conceptProjectId: string;
    items: ConceptProjectRoadmapDraftItem[];
    roadmapId: string | null;
  },
) {
  const nextRoadmapId = await ensureConceptProjectRoadmap(tx, conceptProjectId, roadmapId);

  await tx.delete(roadmapItems).where(eq(roadmapItems.roadmapId, nextRoadmapId));

  if (items.length > 0) {
    await tx.insert(roadmapItems).values(
      items.map((item, index) => ({
        description: item.description?.trim() || null,
        id: randomUUID(),
        majorVersion: 1,
        minorVersion: index,
        name: item.name.trim(),
        parentId: null,
        roadmapId: nextRoadmapId,
      })),
    );
  }

  await tx
    .update(roadmaps)
    .set({
      currentMajor: items.length > 0 ? 1 : 0,
      currentMinor: items.length > 0 ? items.length - 1 : 0,
    })
    .where(eq(roadmaps.id, nextRoadmapId));

  return nextRoadmapId;
}

export async function applyConceptProjectStageUnderstanding(
  tx: Transaction,
  {
    chatId,
    conceptProjectId,
    description,
    handoffMessage,
    name,
    roadmapItems: nextRoadmapItems,
    stage,
    summary,
  }: ApplyConceptProjectStageUnderstandingArgs,
  currentRoadmapId: string | null,
) {
  const summaryColumn = getSummaryColumn(stage);
  const timestampColumn = getTimestampColumn(stage);
  const nextStage = getNextConceptProjectStage(stage);

  const nextRoadmapId = await replaceConceptProjectRoadmapItems(tx, {
    conceptProjectId,
    items: nextRoadmapItems,
    roadmapId: currentRoadmapId,
  });

  await tx
    .update(conceptProjects)
    .set({
      currentStage: nextStage,
      description: description.trim(),
      name: name.trim(),
      roadmapId: nextRoadmapId,
      [summaryColumn]: summary.trim(),
      [timestampColumn]: new Date(),
    })
    .where(eq(conceptProjects.id, conceptProjectId));

  await appendConceptProjectChatMessage(tx, {
    chatId,
    message: handoffMessage.trim(),
    stage: nextStage,
    type: "agent",
  });
}

export async function setConceptProjectCurrentStage(
  tx: Transaction,
  conceptProjectId: string,
  stage: ConceptProjectStage,
) {
  await tx
    .update(conceptProjects)
    .set({
      currentStage: stage,
    })
    .where(eq(conceptProjects.id, conceptProjectId));
}
