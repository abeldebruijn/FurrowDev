import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { ideas, roadmapItems, users, visionSummaryDocuments, visions } from "@/drizzle/schema";
import { getDb, type Database } from "@/lib/db";
import { getProjectAccess, getProjectRoadmapItems } from "@/lib/project/server";
import { getAccessibleVision } from "@/lib/vision/server";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Queryable = Database | Transaction;

type ConvertVisionToIdeaArgs = {
  roadmapItemId?: string;
  title?: string;
};

type IdeaRow = {
  context: string;
  createdAt: Date;
  createdByName: string;
  createdByUserId: string;
  id: string;
  projectId: string;
  roadmapItemId: string | null;
  roadmapItemName: string | null;
  roadmapItemMajorVersion: number | null;
  roadmapItemMinorVersion: number | null;
  sourceVisionId: string;
  sourceVisionTitle: string;
  title: string;
  updatedAt: Date;
};

export type ProjectIdea = Awaited<ReturnType<typeof listProjectIdeas>>[number];

function normalizeIdeaTitle(title: string | undefined, fallback: string) {
  const trimmedTitle = title?.trim();

  return trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : fallback;
}

async function getIdeaBySourceVisionId(
  projectId: string,
  visionId: string,
  db: Queryable = getDb(),
): Promise<IdeaRow | null> {
  const rows = await db
    .select({
      context: ideas.context,
      createdAt: ideas.createdAt,
      createdByName: users.name,
      createdByUserId: ideas.createdByUserId,
      id: ideas.id,
      projectId: ideas.projectId,
      roadmapItemId: ideas.roadmapItemId,
      roadmapItemMajorVersion: roadmapItems.majorVersion,
      roadmapItemMinorVersion: roadmapItems.minorVersion,
      roadmapItemName: roadmapItems.name,
      sourceVisionId: ideas.sourceVisionId,
      sourceVisionTitle: visions.title,
      title: ideas.title,
      updatedAt: ideas.updatedAt,
    })
    .from(ideas)
    .innerJoin(users, eq(users.id, ideas.createdByUserId))
    .innerJoin(visions, eq(visions.id, ideas.sourceVisionId))
    .leftJoin(roadmapItems, eq(roadmapItems.id, ideas.roadmapItemId))
    .where(and(eq(ideas.projectId, projectId), eq(ideas.sourceVisionId, visionId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getIdeaBySourceVision(
  viewerId: string,
  projectId: string,
  visionId: string,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return null;
  }

  return getIdeaBySourceVisionId(projectId, visionId, db);
}

export async function listProjectIdeas(
  viewerId: string,
  projectId: string,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return [];
  }

  return db
    .select({
      context: ideas.context,
      createdAt: ideas.createdAt,
      createdByName: users.name,
      createdByUserId: ideas.createdByUserId,
      id: ideas.id,
      projectId: ideas.projectId,
      roadmapItemId: ideas.roadmapItemId,
      roadmapItemMajorVersion: roadmapItems.majorVersion,
      roadmapItemMinorVersion: roadmapItems.minorVersion,
      roadmapItemName: roadmapItems.name,
      sourceVisionId: ideas.sourceVisionId,
      sourceVisionTitle: visions.title,
      title: ideas.title,
      updatedAt: ideas.updatedAt,
    })
    .from(ideas)
    .innerJoin(users, eq(users.id, ideas.createdByUserId))
    .innerJoin(visions, eq(visions.id, ideas.sourceVisionId))
    .leftJoin(roadmapItems, eq(roadmapItems.id, ideas.roadmapItemId))
    .where(eq(ideas.projectId, projectId))
    .orderBy(desc(ideas.createdAt), ideas.title);
}

export async function convertVisionToIdea(
  viewerId: string,
  projectId: string,
  visionId: string,
  { roadmapItemId, title }: ConvertVisionToIdeaArgs = {},
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return { error: "not_found" as const, idea: null };
  }

  if (!(project.isOwner || project.isAdmin || project.isMaintainer)) {
    return { error: "forbidden" as const, idea: null };
  }

  const existingIdea = await getIdeaBySourceVisionId(projectId, visionId, db);

  if (existingIdea) {
    return { error: null, idea: existingIdea };
  }

  const vision = await getAccessibleVision(viewerId, projectId, visionId, db);

  if (!vision) {
    return { error: "not_found" as const, idea: null };
  }

  if (roadmapItemId) {
    const projectRoadmapItems = await getProjectRoadmapItems(project.roadmapId, db);

    if (!projectRoadmapItems.some((item) => item.id === roadmapItemId)) {
      return { error: "invalid_roadmap_item" as const, idea: null };
    }
  }

  const ideaId = randomUUID();
  const now = new Date();
  const nextTitle = normalizeIdeaTitle(title, vision.title);
  const summary = await db
    .select({
      content: visionSummaryDocuments.content,
    })
    .from(visionSummaryDocuments)
    .where(eq(visionSummaryDocuments.visionId, visionId))
    .limit(1)
    .then((rows) => rows[0]?.content ?? "");

  await db.transaction(async (tx) => {
    await tx
      .insert(ideas)
      .values({
        context: summary,
        createdAt: now,
        createdByUserId: viewerId,
        id: ideaId,
        projectId,
        roadmapItemId: roadmapItemId || null,
        sourceVisionId: visionId,
        title: nextTitle,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: ideas.sourceVisionId });

    await tx
      .update(visions)
      .set({
        archivedAt: now,
        updatedAt: now,
      })
      .where(eq(visions.id, visionId));
  });

  const idea = await getIdeaBySourceVision(viewerId, projectId, visionId, db);

  if (!idea) {
    return { error: "not_found" as const, idea: null };
  }

  return { error: null, idea };
}