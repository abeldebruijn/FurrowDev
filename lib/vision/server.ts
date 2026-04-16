import { randomUUID } from "node:crypto";

import { generateText } from "ai";
import { and, desc, eq, inArray, isNull, max, or, sql } from "drizzle-orm";

import {
  admins,
  organisations,
  projects,
  users,
  visionCollaborators,
  visionMessages,
  visions,
  visionSummaryDocuments,
} from "@/drizzle/schema";
import { getDb, type Database } from "@/lib/db";
import {
  getProjectAccess,
  getProjectRoadmap,
  getProjectRoadmapItems,
  type ProjectRoadmap,
  type ProjectRoadmapItem,
} from "@/lib/project/server";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Queryable = Database | Transaction;

export type AccessibleVision = {
  createdAt: Date;
  id: string;
  ownerName: string;
  ownerUserId: string;
  projectId: string;
  summary: string;
  title: string;
  updatedAt: Date;
};

export type VisionListItem = {
  archivedAt: Date | null;
  collaborators: Array<{
    name: string;
    userId: string;
  }>;
  createdAt: Date;
  id: string;
  ownerName: string;
  ownerUserId: string;
  title: string;
  updatedAt: Date;
};

export type VisionMessage = Awaited<ReturnType<typeof getVisionMessages>>[number];
export type VisionCollaborator = Awaited<ReturnType<typeof getVisionCollaborators>>[number];
export type EligibleVisionCollaborator = Awaited<
  ReturnType<typeof listEligibleVisionCollaborators>
>[number];

type CreateVisionArgs = {
  projectId: string;
  roadmapItemId?: string;
  title?: string;
  viewerId: string;
};

type AppendVisionMessageArgs = {
  authorUserId?: string;
  content: string;
  id?: string;
  role: "assistant" | "user";
  visionId: string;
};

type ManageVisionResult = {
  error: "forbidden" | "not_found" | null;
};

const VISION_MODEL = "anthropic/claude-sonnet-4.6";

function getDefaultVisionTitle(title?: string) {
  const trimmedTitle = title?.trim();

  return trimmedTitle ? trimmedTitle : "Untitled vision";
}

function getDefaultVisionOpeningMessage(roadmapItem?: {
  description: string | null;
  name: string;
}) {
  if (!roadmapItem) {
    return "What do you want to explore in this vision? I can help turn a rough build idea into a clearer direction.";
  }

  const roadmapDescription = roadmapItem.description?.trim();

  return [
    `You started this vision from roadmap item "${roadmapItem.name}".`,
    roadmapDescription ? `Current roadmap note: ${roadmapDescription}` : null,
    "What do you want to explore, refine, or challenge about that direction?",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildInitialVisionSummary(args: {
  openingMessage: string;
  roadmapItem?: {
    description: string | null;
    name: string;
  };
  title: string;
}) {
  return [
    "## What they're exploring",
    "",
    `- Vision title: ${args.title}`,
    args.roadmapItem ? `- Started from roadmap item: ${args.roadmapItem.name}` : null,
    "",
    "## Current understanding",
    "",
    `- ${args.openingMessage}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildFallbackVisionSummary(args: {
  title: string;
  messages: VisionMessage[];
  roadmap: {
    current: ProjectRoadmap;
    items: ProjectRoadmapItem[];
  };
}) {
  const recentMessages = args.messages
    .slice(-6)
    .map((message) => `- ${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");
  const roadmapSummary =
    args.roadmap.items.length === 0
      ? "- No roadmap items available."
      : args.roadmap.items
          .slice(0, 5)
          .map((item) => `- v${item.majorVersion}.${item.minorVersion} ${item.name}`)
          .join("\n");

  return [
    "## What they're exploring",
    "",
    `- Vision title: ${args.title}`,
    "",
    "## Current understanding",
    "",
    recentMessages || "- Conversation just started.",
    "",
    "## Roadmap context",
    "",
    roadmapSummary,
    "",
    "## Open questions",
    "",
    "- Keep refining the desired outcome, users, and tradeoffs.",
  ].join("\n");
}

async function getNextVisionMessageOrder(tx: Transaction, visionId: string) {
  const rows = await tx
    .select({
      order: max(visionMessages.order),
    })
    .from(visionMessages)
    .where(eq(visionMessages.visionId, visionId));

  return (rows[0]?.order ?? -1) + 1;
}

async function lockVisionRow(tx: Transaction, visionId: string) {
  await tx.execute(
    sql`select ${visions.id} from ${visions} where ${visions.id} = ${visionId} for update`,
  );
}

export async function appendVisionMessage(
  tx: Transaction,
  { authorUserId, content, id = randomUUID(), role, visionId }: AppendVisionMessageArgs,
) {
  await lockVisionRow(tx, visionId);
  const nextOrder = await getNextVisionMessageOrder(tx, visionId);

  const insertedRows = await tx
    .insert(visionMessages)
    .values({
      authorUserId: role === "user" ? (authorUserId ?? null) : null,
      content,
      id,
      order: nextOrder,
      role,
      visionId,
    })
    .onConflictDoNothing()
    .returning({ id: visionMessages.id });

  if (insertedRows.length === 0) {
    return null;
  }

  await tx.update(visions).set({ updatedAt: new Date() }).where(eq(visions.id, visionId));

  return id;
}

export async function upsertVisionSummaryDocument(
  tx: Transaction,
  { content, visionId }: { content: string; visionId: string },
) {
  await tx
    .insert(visionSummaryDocuments)
    .values({
      content,
      updatedAt: new Date(),
      visionId,
    })
    .onConflictDoUpdate({
      set: {
        content,
        updatedAt: new Date(),
      },
      target: visionSummaryDocuments.visionId,
    });
}

export async function getVisionMessages(visionId: string, db: Queryable = getDb()) {
  return db
    .select({
      authorUserId: visionMessages.authorUserId,
      content: visionMessages.content,
      createdAt: visionMessages.createdAt,
      id: visionMessages.id,
      order: visionMessages.order,
      role: visionMessages.role,
    })
    .from(visionMessages)
    .where(eq(visionMessages.visionId, visionId))
    .orderBy(visionMessages.order);
}

export async function getVisionCollaborators(visionId: string, db: Queryable = getDb()) {
  return db
    .select({
      addedByUserId: visionCollaborators.addedByUserId,
      createdAt: visionCollaborators.createdAt,
      name: users.name,
      userId: users.id,
    })
    .from(visionCollaborators)
    .innerJoin(users, eq(users.id, visionCollaborators.userId))
    .where(eq(visionCollaborators.visionId, visionId))
    .orderBy(users.name);
}

export async function getVisionSummaryDocument(visionId: string, db: Queryable = getDb()) {
  const rows = await db
    .select({
      content: visionSummaryDocuments.content,
      updatedAt: visionSummaryDocuments.updatedAt,
    })
    .from(visionSummaryDocuments)
    .where(eq(visionSummaryDocuments.visionId, visionId))
    .limit(1);

  return rows[0] ?? null;
}

export async function getAccessibleVision(
  viewerId: string,
  projectId: string,
  visionId: string,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return null;
  }

  const rows = await db
    .select({
      createdAt: visions.createdAt,
      id: visions.id,
      ownerName: users.name,
      ownerUserId: visions.ownerUserId,
      projectId: visions.projectId,
      summary: visionSummaryDocuments.content,
      title: visions.title,
      updatedAt: visions.updatedAt,
    })
    .from(visions)
    .innerJoin(users, eq(users.id, visions.ownerUserId))
    .leftJoin(
      visionCollaborators,
      and(eq(visionCollaborators.visionId, visions.id), eq(visionCollaborators.userId, viewerId)),
    )
    .leftJoin(visionSummaryDocuments, eq(visionSummaryDocuments.visionId, visions.id))
    .where(
      and(
        eq(visions.id, visionId),
        isNull(visions.archivedAt),
        eq(visions.projectId, projectId),
        or(eq(visions.ownerUserId, viewerId), eq(visionCollaborators.userId, viewerId)),
      ),
    )
    .limit(1);

  const vision = rows[0];

  if (!vision) {
    return null;
  }

  return {
    ...vision,
    summary: vision.summary ?? "",
  } satisfies AccessibleVision;
}

export async function listVisibleProjectVisions(
  viewerId: string,
  projectId: string,
  db: Database = getDb(),
  options: {
    includeArchived?: boolean;
  } = {},
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return [];
  }

  const visibleRows = await db
    .select({
      archivedAt: visions.archivedAt,
      createdAt: visions.createdAt,
      id: visions.id,
      ownerName: users.name,
      ownerUserId: visions.ownerUserId,
      title: visions.title,
      updatedAt: visions.updatedAt,
    })
    .from(visions)
    .innerJoin(users, eq(users.id, visions.ownerUserId))
    .leftJoin(
      visionCollaborators,
      and(eq(visionCollaborators.visionId, visions.id), eq(visionCollaborators.userId, viewerId)),
    )
    .where(
      options.includeArchived
        ? and(
            eq(visions.projectId, projectId),
            or(eq(visions.ownerUserId, viewerId), eq(visionCollaborators.userId, viewerId)),
          )
        : and(
            isNull(visions.archivedAt),
            eq(visions.projectId, projectId),
            or(eq(visions.ownerUserId, viewerId), eq(visionCollaborators.userId, viewerId)),
          ),
    )
    .orderBy(desc(visions.updatedAt), visions.createdAt);

  if (visibleRows.length === 0) {
    return [];
  }

  const collaboratorRows = await db
    .select({
      name: users.name,
      userId: users.id,
      visionId: visionCollaborators.visionId,
    })
    .from(visionCollaborators)
    .innerJoin(users, eq(users.id, visionCollaborators.userId))
    .where(
      inArray(
        visionCollaborators.visionId,
        visibleRows.map((row) => row.id),
      ),
    )
    .orderBy(users.name);

  const collaboratorsByVisionId = new Map<string, VisionListItem["collaborators"]>();

  for (const collaborator of collaboratorRows) {
    const existing = collaboratorsByVisionId.get(collaborator.visionId) ?? [];
    existing.push({
      name: collaborator.name,
      userId: collaborator.userId,
    });
    collaboratorsByVisionId.set(collaborator.visionId, existing);
  }

  return visibleRows.map((row) => ({
    archivedAt: row.archivedAt,
    collaborators: collaboratorsByVisionId.get(row.id) ?? [],
    createdAt: row.createdAt,
    id: row.id,
    ownerName: row.ownerName,
    ownerUserId: row.ownerUserId,
    title: row.title,
    updatedAt: row.updatedAt,
  })) satisfies VisionListItem[];
}

export async function hasArchivedProjectVisions(
  viewerId: string,
  projectId: string,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return false;
  }

  const archivedVision = await db
    .select({
      id: visions.id,
    })
    .from(visions)
    .leftJoin(
      visionCollaborators,
      and(eq(visionCollaborators.visionId, visions.id), eq(visionCollaborators.userId, viewerId)),
    )
    .where(
      and(
        eq(visions.projectId, projectId),
        or(eq(visions.ownerUserId, viewerId), eq(visionCollaborators.userId, viewerId)),
        sql`${visions.archivedAt} is not null`,
      ),
    )
    .limit(1);

  return archivedVision.length > 0;
}

export async function listEligibleVisionCollaborators(
  viewerId: string,
  projectId: string,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return [];
  }

  const [projectRow, adminRows] = await Promise.all([
    db
      .select({
        organisationOwnerId: organisations.ownerId,
        userOwnerId: projects.userOwner,
      })
      .from(projects)
      .leftJoin(organisations, eq(projects.orgOwner, organisations.id))
      .where(eq(projects.id, projectId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        userId: admins.userId,
      })
      .from(admins)
      .where(eq(admins.projectId, projectId)),
  ]);

  const accessibleUserIds = new Set<string>();

  if (projectRow?.userOwnerId) {
    accessibleUserIds.add(projectRow.userOwnerId);
  }

  if (projectRow?.organisationOwnerId) {
    accessibleUserIds.add(projectRow.organisationOwnerId);
  }

  for (const admin of adminRows) {
    accessibleUserIds.add(admin.userId);
  }

  if (accessibleUserIds.size === 0) {
    return [];
  }

  return db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(inArray(users.id, [...accessibleUserIds]))
    .orderBy(users.name);
}

export async function createVision(
  { projectId, roadmapItemId, title, viewerId }: CreateVisionArgs,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return null;
  }

  const roadmapItems = await getProjectRoadmapItems(project.roadmapId, db);
  const roadmapItem = roadmapItemId
    ? (roadmapItems.find((item) => item.id === roadmapItemId) ?? null)
    : null;

  if (roadmapItemId && !roadmapItem) {
    throw new Error("Roadmap item not found.");
  }

  const visionId = randomUUID();
  const nextTitle = getDefaultVisionTitle(title);
  const openingMessage = getDefaultVisionOpeningMessage(roadmapItem ?? undefined);
  const initialSummary = buildInitialVisionSummary({
    openingMessage,
    roadmapItem: roadmapItem ?? undefined,
    title: nextTitle,
  });

  await db.transaction(async (tx) => {
    await tx.insert(visions).values({
      id: visionId,
      ownerUserId: viewerId,
      projectId,
      title: nextTitle,
      updatedAt: new Date(),
    });

    await upsertVisionSummaryDocument(tx, {
      content: initialSummary,
      visionId,
    });

    await appendVisionMessage(tx, {
      content: openingMessage,
      role: "assistant",
      visionId,
    });
  });

  return visionId;
}

export async function addVisionCollaborator(
  viewerId: string,
  projectId: string,
  visionId: string,
  collaboratorUserId: string,
  db: Database = getDb(),
) {
  const vision = await getAccessibleVision(viewerId, projectId, visionId, db);

  if (!vision) {
    return { error: "not_found" as const };
  }

  if (vision.ownerUserId !== viewerId) {
    return { error: "forbidden" as const };
  }

  if (collaboratorUserId === vision.ownerUserId) {
    return { error: "owner" as const };
  }

  const eligibleUsers = await listEligibleVisionCollaborators(viewerId, projectId, db);

  if (!eligibleUsers.some((user) => user.id === collaboratorUserId)) {
    return { error: "invalid_user" as const };
  }

  await db
    .insert(visionCollaborators)
    .values({
      addedByUserId: viewerId,
      userId: collaboratorUserId,
      visionId,
    })
    .onConflictDoNothing();

  return { error: null };
}

export async function removeVisionCollaborator(
  viewerId: string,
  projectId: string,
  visionId: string,
  collaboratorUserId: string,
  db: Database = getDb(),
) {
  const vision = await getAccessibleVision(viewerId, projectId, visionId, db);

  if (!vision) {
    return { error: "not_found" as const };
  }

  if (vision.ownerUserId !== viewerId) {
    return { error: "forbidden" as const };
  }

  if (collaboratorUserId === vision.ownerUserId) {
    return { error: "owner" as const };
  }

  await db
    .delete(visionCollaborators)
    .where(
      and(
        eq(visionCollaborators.visionId, visionId),
        eq(visionCollaborators.userId, collaboratorUserId),
      ),
    );

  return { error: null };
}

async function getManageableVision(
  viewerId: string,
  projectId: string,
  visionId: string,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return { error: "not_found" as const, vision: null };
  }

  const vision = await db
    .select({
      id: visions.id,
      ownerUserId: visions.ownerUserId,
    })
    .from(visions)
    .where(and(eq(visions.id, visionId), eq(visions.projectId, projectId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!vision) {
    return { error: "not_found" as const, vision: null };
  }

  if (vision.ownerUserId !== viewerId) {
    return { error: "forbidden" as const, vision: null };
  }

  return { error: null, vision };
}

export async function updateAccessibleVision(
  viewerId: string,
  projectId: string,
  visionId: string,
  values: {
    title?: string;
  },
  db: Database = getDb(),
): Promise<ManageVisionResult> {
  const result = await getManageableVision(viewerId, projectId, visionId, db);

  if (result.error) {
    return { error: result.error };
  }

  const nextValues: Record<string, Date | string> = {};

  if (values.title !== undefined) {
    nextValues.title = values.title.trim();
  }

  if (Object.keys(nextValues).length === 0) {
    return { error: null };
  }

  nextValues.updatedAt = new Date();

  await db.update(visions).set(nextValues).where(eq(visions.id, visionId));

  return { error: null };
}

export async function archiveAccessibleVision(
  viewerId: string,
  projectId: string,
  visionId: string,
  db: Database = getDb(),
): Promise<ManageVisionResult> {
  const result = await getManageableVision(viewerId, projectId, visionId, db);

  if (result.error) {
    return { error: result.error };
  }

  await db
    .update(visions)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(visions.id, visionId));

  return { error: null };
}

export async function deleteAccessibleVision(
  viewerId: string,
  projectId: string,
  visionId: string,
  db: Database = getDb(),
): Promise<ManageVisionResult> {
  const result = await getManageableVision(viewerId, projectId, visionId, db);

  if (result.error) {
    return { error: result.error };
  }

  await db.delete(visions).where(eq(visions.id, visionId));

  return { error: null };
}

export async function refreshVisionSummaryDocument(visionId: string, db: Database = getDb()) {
  const visionRow = await db
    .select({
      projectId: visions.projectId,
      title: visions.title,
    })
    .from(visions)
    .where(eq(visions.id, visionId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!visionRow) {
    return null;
  }

  const projectRow = await db
    .select({
      roadmapId: projects.roadmapId,
    })
    .from(projects)
    .where(eq(projects.id, visionRow.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const [transcript, existingSummary, roadmap, roadmapItems] = await Promise.all([
    getVisionMessages(visionId, db),
    getVisionSummaryDocument(visionId, db),
    getProjectRoadmap(projectRow?.roadmapId ?? null, db),
    getProjectRoadmapItems(projectRow?.roadmapId ?? null, db),
  ]);

  const transcriptText = transcript
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");
  const roadmapText =
    roadmapItems.length === 0
      ? "- No roadmap items available."
      : roadmapItems
          .map(
            (item) =>
              `- v${item.majorVersion}.${item.minorVersion} | ${item.name}: ${item.description?.trim() || "No description yet."}`,
          )
          .join("\n");

  let summary = "";

  try {
    const result = await generateText({
      model: VISION_MODEL,
      prompt: [
        "You maintain the hidden working summary for a private product vision chat.",
        "Write concise markdown with these exact sections:",
        "## What they're exploring",
        "## Current understanding",
        "## Roadmap context",
        "## Open questions",
        "Be factual, specific, and under 320 words.",
        `Vision title: ${visionRow.title}`,
        "",
        "Existing summary:",
        existingSummary?.content?.trim() || "None yet.",
        "",
        "Project roadmap:",
        roadmap
          ? `Current v${roadmap.currentMajor}.${roadmap.currentMinor}`
          : "No current roadmap version.",
        roadmapText,
        "",
        "Transcript:",
        transcriptText || "Conversation just started.",
      ].join("\n"),
    });

    summary = result.text.trim();
  } catch {}

  if (!summary) {
    summary = buildFallbackVisionSummary({
      messages: transcript,
      roadmap: {
        current: roadmap,
        items: roadmapItems,
      },
      title: visionRow.title,
    });
  }

  await db.transaction(async (tx) => {
    await upsertVisionSummaryDocument(tx, {
      content: summary,
      visionId,
    });
  });

  return summary;
}
