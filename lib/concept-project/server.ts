import { randomUUID } from "node:crypto";

import { and, eq, inArray, max, or } from "drizzle-orm";

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
} from "@/lib/concept-project/shared";
import {
  getConceptProjectRoadmapDeletePlan,
  getConceptProjectRoadmapInsertPlan,
} from "@/lib/concept-project/roadmap";
import { getSetupRoadmapCurrentVersion } from "@/lib/concept-project/setup";

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
  understoodSetupAt: Date | null;
  understoodWhatAt: Date | null;
  setupSummary: string | null;
  whatSummary: string | null;
};

export type ConceptProjectTranscriptMessage = Awaited<
  ReturnType<typeof getConceptProjectTranscript>
>[number];

export type ConceptProjectRoadmapItem = Awaited<
  ReturnType<typeof getConceptProjectRoadmapItems>
>[number];
export type ConceptProjectRoadmap = Awaited<ReturnType<typeof getConceptProjectRoadmap>>;

type AppendConceptProjectChatMessageArgs = {
  chatId: string;
  id?: string;
  message: string;
  stage: ConceptProjectStage;
  type: ConceptProjectChatAuthor;
  userId?: string;
};

type ApplyConceptProjectStageUnderstandingArgs = {
  conceptProjectId: string;
  description: string;
  name: string;
  roadmapItems: ConceptProjectRoadmapDraftItem[];
  stage: Exclude<ConceptProjectStage, "setup">;
  summary: string;
};

type ApplyConceptProjectSetupUnderstandingArgs = {
  conceptProjectId: string;
  roadmapItems: ConceptProjectRoadmapDraftItem[];
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
      understoodSetupAt: conceptProjects.understoodSetupAt,
      understoodWhatAt: conceptProjects.understoodWhatAt,
      setupSummary: conceptProjects.setupSummary,
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

export async function deleteAccessibleConceptProject(
  viewerId: string,
  conceptProjectId: string,
  db: Database = getDb(),
) {
  const conceptProject = await getAccessibleConceptProject(viewerId, conceptProjectId, db);

  if (!conceptProject) {
    return false;
  }

  await db.transaction(async (tx) => {
    if (conceptProject.roadmapId) {
      await tx.delete(roadmaps).where(eq(roadmaps.id, conceptProject.roadmapId));
    }

    await tx.delete(conceptProjects).where(eq(conceptProjects.id, conceptProject.id));
  });

  return true;
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

export async function getConceptProjectRoadmap(roadmapId: string | null, db: Database = getDb()) {
  if (!roadmapId) {
    return null;
  }

  const rows = await db
    .select({
      currentMajor: roadmaps.currentMajor,
      currentMinor: roadmaps.currentMinor,
      id: roadmaps.id,
    })
    .from(roadmaps)
    .where(eq(roadmaps.id, roadmapId))
    .limit(1);

  return rows[0] ?? null;
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

async function getCurrentRoadmapVersion(
  tx: Transaction,
  roadmapId: string,
): Promise<{ currentMajor: number; currentMinor: number } | null> {
  const rows = await tx
    .select({
      currentMajor: roadmaps.currentMajor,
      currentMinor: roadmaps.currentMinor,
    })
    .from(roadmaps)
    .where(eq(roadmaps.id, roadmapId))
    .limit(1);

  return rows[0] ?? null;
}

export async function insertConceptProjectRoadmapVersion(
  tx: Transaction,
  {
    conceptProjectId,
    description,
    id = randomUUID(),
    majorVersion,
    minorVersion,
    name,
    roadmapId,
  }: {
    conceptProjectId: string;
    description?: string | null;
    id?: string;
    majorVersion: number;
    minorVersion: number;
    name: string;
    roadmapId: string | null;
  },
) {
  if (!roadmapId) {
    throw new Error("Roadmap not found.");
  }

  const [currentVersion, existingItems] = await Promise.all([
    getCurrentRoadmapVersion(tx, roadmapId),
    tx
      .select({
        description: roadmapItems.description,
        id: roadmapItems.id,
        majorVersion: roadmapItems.majorVersion,
        minorVersion: roadmapItems.minorVersion,
        name: roadmapItems.name,
      })
      .from(roadmapItems)
      .where(eq(roadmapItems.roadmapId, roadmapId))
      .orderBy(roadmapItems.majorVersion, roadmapItems.minorVersion, roadmapItems.name),
  ]);

  const plan = getConceptProjectRoadmapInsertPlan(existingItems, currentVersion, {
    majorVersion,
    minorVersion,
  });

  const shiftedIds = plan.shiftedItems.map((item) => item.id);

  if (shiftedIds.length > 0) {
    const shiftedMinorVersionById = new Map(
      plan.shiftedItems.map((item) => [item.id, item.nextMinorVersion]),
    );
    const shiftedRecords = await tx
      .select({
        id: roadmapItems.id,
      })
      .from(roadmapItems)
      .where(inArray(roadmapItems.id, shiftedIds));

    const shiftQueue = shiftedRecords
      .map((record) => ({
        id: record.id,
        nextMinorVersion: shiftedMinorVersionById.get(record.id),
      }))
      .filter((item): item is { id: string; nextMinorVersion: number } => {
        return item.nextMinorVersion !== undefined;
      })
      .sort((left, right) => right.nextMinorVersion - left.nextMinorVersion);

    for (const item of shiftQueue) {
      await tx
        .update(roadmapItems)
        .set({
          minorVersion: item.nextMinorVersion,
        })
        .where(eq(roadmapItems.id, item.id));
    }
  }

  await tx.insert(roadmapItems).values({
    description: description?.trim() || null,
    id,
    majorVersion,
    minorVersion,
    name: name.trim(),
    parentId: null,
    roadmapId,
  });

  if (
    plan.nextCurrentVersion &&
    currentVersion &&
    (plan.nextCurrentVersion.currentMajor !== currentVersion.currentMajor ||
      plan.nextCurrentVersion.currentMinor !== currentVersion.currentMinor)
  ) {
    await tx
      .update(roadmaps)
      .set({
        currentMajor: plan.nextCurrentVersion.currentMajor,
        currentMinor: plan.nextCurrentVersion.currentMinor,
      })
      .where(eq(roadmaps.id, roadmapId));
  }

  return {
    conceptProjectId,
    id,
  };
}

export async function deleteConceptProjectRoadmapNode(
  tx: Transaction,
  {
    conceptProjectId,
    id,
    roadmapId,
  }: {
    conceptProjectId: string;
    id: string;
    roadmapId: string | null;
  },
) {
  if (!roadmapId) {
    throw new Error("Roadmap not found.");
  }

  const [currentVersion, existingItems] = await Promise.all([
    getCurrentRoadmapVersion(tx, roadmapId),
    tx
      .select({
        description: roadmapItems.description,
        id: roadmapItems.id,
        majorVersion: roadmapItems.majorVersion,
        minorVersion: roadmapItems.minorVersion,
        name: roadmapItems.name,
      })
      .from(roadmapItems)
      .where(eq(roadmapItems.roadmapId, roadmapId))
      .orderBy(roadmapItems.majorVersion, roadmapItems.minorVersion, roadmapItems.name),
  ]);

  const plan = getConceptProjectRoadmapDeletePlan(existingItems, currentVersion, id);

  await tx.delete(roadmapItems).where(eq(roadmapItems.id, id));

  if (plan.shiftedItems.length > 0) {
    const shiftedMinorVersionById = new Map(
      plan.shiftedItems.map((item) => [item.id, item.nextMinorVersion]),
    );
    const shiftedIds = plan.shiftedItems.map((item) => item.id);
    const shiftedRecords = await tx
      .select({
        id: roadmapItems.id,
      })
      .from(roadmapItems)
      .where(inArray(roadmapItems.id, shiftedIds));

    const shiftQueue = shiftedRecords
      .map((record) => ({
        id: record.id,
        nextMinorVersion: shiftedMinorVersionById.get(record.id),
      }))
      .filter((item): item is { id: string; nextMinorVersion: number } => {
        return item.nextMinorVersion !== undefined;
      })
      .sort((left, right) => left.nextMinorVersion - right.nextMinorVersion);

    for (const item of shiftQueue) {
      await tx
        .update(roadmapItems)
        .set({
          minorVersion: item.nextMinorVersion,
        })
        .where(eq(roadmapItems.id, item.id));
    }
  }

  if (
    (plan.nextCurrentVersion?.currentMajor ?? null) !== (currentVersion?.currentMajor ?? null) ||
    (plan.nextCurrentVersion?.currentMinor ?? null) !== (currentVersion?.currentMinor ?? null)
  ) {
    await tx
      .update(roadmaps)
      .set({
        currentMajor: plan.nextCurrentVersion?.currentMajor ?? 0,
        currentMinor: plan.nextCurrentVersion?.currentMinor ?? 0,
      })
      .where(eq(roadmaps.id, roadmapId));
  }

  return {
    conceptProjectId,
    id,
  };
}

export async function replaceConceptProjectSetupRoadmapItems(
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
  const currentVersion = await getCurrentRoadmapVersion(tx, nextRoadmapId);

  await tx
    .delete(roadmapItems)
    .where(and(eq(roadmapItems.roadmapId, nextRoadmapId), eq(roadmapItems.majorVersion, 0)));

  if (items.length > 0) {
    await tx.insert(roadmapItems).values(
      items.map((item, index) => ({
        description: item.description?.trim() || null,
        id: randomUUID(),
        majorVersion: 0,
        minorVersion: index,
        name: item.name.trim(),
        parentId: null,
        roadmapId: nextRoadmapId,
      })),
    );
  }

  const nextCurrentVersion = getSetupRoadmapCurrentVersion(currentVersion, items.length);

  await tx
    .update(roadmaps)
    .set({
      currentMajor: nextCurrentVersion.currentMajor,
      currentMinor: nextCurrentVersion.currentMinor,
    })
    .where(eq(roadmaps.id, nextRoadmapId));

  return nextRoadmapId;
}

export async function applyConceptProjectStageUnderstanding(
  tx: Transaction,
  {
    conceptProjectId,
    description,
    name,
    roadmapItems: nextRoadmapItems,
    stage,
    summary,
  }: ApplyConceptProjectStageUnderstandingArgs,
  currentRoadmapId: string | null,
) {
  const summaryColumn = getSummaryColumn(stage);
  const timestampColumn = getTimestampColumn(stage);

  const nextRoadmapId = await replaceConceptProjectRoadmapItems(tx, {
    conceptProjectId,
    items: nextRoadmapItems,
    roadmapId: currentRoadmapId,
  });

  await tx
    .update(conceptProjects)
    .set({
      description: description.trim(),
      name: name.trim(),
      roadmapId: nextRoadmapId,
      [summaryColumn]: summary.trim(),
      [timestampColumn]: new Date(),
    })
    .where(eq(conceptProjects.id, conceptProjectId));
}

export async function applyConceptProjectSetupUnderstanding(
  tx: Transaction,
  {
    conceptProjectId,
    roadmapItems: nextRoadmapItems,
    summary,
  }: ApplyConceptProjectSetupUnderstandingArgs,
  currentRoadmapId: string | null,
) {
  const nextRoadmapId = await replaceConceptProjectSetupRoadmapItems(tx, {
    conceptProjectId,
    items: nextRoadmapItems,
    roadmapId: currentRoadmapId,
  });

  await tx
    .update(conceptProjects)
    .set({
      roadmapId: nextRoadmapId,
      setupSummary: summary.trim(),
      understoodSetupAt: new Date(),
    })
    .where(eq(conceptProjects.id, conceptProjectId));
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
