import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import {
  ideas,
  type IdeaUserStory,
  roadmapItems,
  users,
  visionSummaryDocuments,
  visions,
} from "@/drizzle/schema";
import { getDb, type Database } from "@/lib/db";
import { getProjectAccess, getProjectRoadmapItems } from "@/lib/project/server";
import { getAccessibleVision } from "@/lib/vision/server";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Queryable = Database | Transaction;

type ConvertVisionToIdeaArgs = {
  roadmapItemId?: string;
  title?: string;
};

type IdeaRowBase = {
  context: string;
  createdAt: Date;
  createdByName: string;
  createdByUserId: string;
  id: string;
  projectId: string;
  roadmapItemId: string | null;
  roadmapItemMajorVersion: number | null;
  roadmapItemMinorVersion: number | null;
  roadmapItemName: string | null;
  sourceVisionId: string;
  sourceVisionTitle: string;
  specSheet: string;
  title: string;
  updatedAt: Date;
  userStories: IdeaUserStory[];
};

type IdeaSummaryRow = Omit<IdeaRowBase, "specSheet" | "userStories">;

type IdeaDetailRow = IdeaRowBase;

type UpdateProjectIdeaWorkspaceArgs = {
  context?: string;
  roadmapItemId?: string | null;
  specSheet?: string;
  userStories?: IdeaUserStory[];
};

type UpdateProjectIdeaWorkspaceError =
  | "invalid_roadmap_item"
  | "invalid_user_stories"
  | "not_found"
  | null;

function normalizeIdeaTitle(title: string | undefined, fallback: string) {
  const trimmedTitle = title?.trim();

  return trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : fallback;
}

function isValidIdeaUserStories(stories: IdeaUserStory[]) {
  return stories.every((story) => {
    const normalizedId = story.id.trim();
    const normalizedStory = story.story.trim();
    const normalizedOutcome = story.outcome.trim();

    return normalizedId.length > 0 && normalizedStory.length > 0 && normalizedOutcome.length > 0;
  });
}

function normalizeIdeaUserStories(stories: IdeaUserStory[]) {
  return stories.map((story) => ({
    id: story.id.trim(),
    outcome: story.outcome.trim(),
    story: story.story.trim(),
  }));
}

function ideaSelectFields(includeWorkspaceFields: false): {
  context: typeof ideas.context;
  createdAt: typeof ideas.createdAt;
  createdByName: typeof users.name;
  createdByUserId: typeof ideas.createdByUserId;
  id: typeof ideas.id;
  projectId: typeof ideas.projectId;
  roadmapItemId: typeof ideas.roadmapItemId;
  roadmapItemMajorVersion: typeof roadmapItems.majorVersion;
  roadmapItemMinorVersion: typeof roadmapItems.minorVersion;
  roadmapItemName: typeof roadmapItems.name;
  sourceVisionId: typeof ideas.sourceVisionId;
  sourceVisionTitle: typeof visions.title;
  title: typeof ideas.title;
  updatedAt: typeof ideas.updatedAt;
};
function ideaSelectFields(includeWorkspaceFields: true): {
  context: typeof ideas.context;
  createdAt: typeof ideas.createdAt;
  createdByName: typeof users.name;
  createdByUserId: typeof ideas.createdByUserId;
  id: typeof ideas.id;
  projectId: typeof ideas.projectId;
  roadmapItemId: typeof ideas.roadmapItemId;
  roadmapItemMajorVersion: typeof roadmapItems.majorVersion;
  roadmapItemMinorVersion: typeof roadmapItems.minorVersion;
  roadmapItemName: typeof roadmapItems.name;
  sourceVisionId: typeof ideas.sourceVisionId;
  sourceVisionTitle: typeof visions.title;
  specSheet: typeof ideas.specSheet;
  title: typeof ideas.title;
  updatedAt: typeof ideas.updatedAt;
  userStories: typeof ideas.userStories;
};
function ideaSelectFields(includeWorkspaceFields: boolean) {
  const baseFields = {
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
  };

  if (!includeWorkspaceFields) {
    return baseFields;
  }

  return {
    ...baseFields,
    specSheet: ideas.specSheet,
    userStories: ideas.userStories,
  };
}

async function getIdeaBySourceVisionId(
  projectId: string,
  visionId: string,
  db: Queryable = getDb(),
): Promise<IdeaSummaryRow | null> {
  const rows = await db
    .select(ideaSelectFields(false))
    .from(ideas)
    .innerJoin(users, eq(users.id, ideas.createdByUserId))
    .innerJoin(visions, eq(visions.id, ideas.sourceVisionId))
    .leftJoin(roadmapItems, eq(roadmapItems.id, ideas.roadmapItemId))
    .where(and(eq(ideas.projectId, projectId), eq(ideas.sourceVisionId, visionId)))
    .limit(1);

  return rows[0] ?? null;
}

async function getIdeaById(
  projectId: string,
  ideaId: string,
  db: Queryable = getDb(),
): Promise<IdeaDetailRow | null> {
  const rows = await db
    .select(ideaSelectFields(true))
    .from(ideas)
    .innerJoin(users, eq(users.id, ideas.createdByUserId))
    .innerJoin(visions, eq(visions.id, ideas.sourceVisionId))
    .leftJoin(roadmapItems, eq(roadmapItems.id, ideas.roadmapItemId))
    .where(and(eq(ideas.projectId, projectId), eq(ideas.id, ideaId)))
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

export async function getProjectIdeaById(
  viewerId: string,
  projectId: string,
  ideaId: string,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return null;
  }

  return getIdeaById(projectId, ideaId, db);
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
    .select(ideaSelectFields(false))
    .from(ideas)
    .innerJoin(users, eq(users.id, ideas.createdByUserId))
    .innerJoin(visions, eq(visions.id, ideas.sourceVisionId))
    .leftJoin(roadmapItems, eq(roadmapItems.id, ideas.roadmapItemId))
    .where(eq(ideas.projectId, projectId))
    .orderBy(desc(ideas.createdAt), ideas.title);
}

export async function updateProjectIdeaWorkspace(
  viewerId: string,
  projectId: string,
  ideaId: string,
  patch: UpdateProjectIdeaWorkspaceArgs,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return { error: "not_found" as const, idea: null };
  }

  const idea = await getIdeaById(projectId, ideaId, db);

  if (!idea) {
    return { error: "not_found" as const, idea: null };
  }

  if (patch.roadmapItemId !== undefined && patch.roadmapItemId !== null) {
    const projectRoadmapItems = await getProjectRoadmapItems(project.roadmapId, db);

    if (!projectRoadmapItems.some((item) => item.id === patch.roadmapItemId)) {
      return { error: "invalid_roadmap_item" as const, idea: null };
    }
  }

  let normalizedStories: IdeaUserStory[] | undefined = undefined;

  if (patch.userStories !== undefined) {
    if (!Array.isArray(patch.userStories) || !isValidIdeaUserStories(patch.userStories)) {
      return { error: "invalid_user_stories" as const, idea: null };
    }

    normalizedStories = normalizeIdeaUserStories(patch.userStories);
  }

  const updateValues: Partial<{
    context: string;
    roadmapItemId: string | null;
    specSheet: string;
    updatedAt: Date;
    userStories: IdeaUserStory[];
  }> = {
    updatedAt: new Date(),
  };

  if (patch.context !== undefined) {
    updateValues.context = patch.context;
  }

  if (patch.roadmapItemId !== undefined) {
    updateValues.roadmapItemId = patch.roadmapItemId;
  }

  if (patch.specSheet !== undefined) {
    updateValues.specSheet = patch.specSheet;
  }

  if (normalizedStories !== undefined) {
    updateValues.userStories = normalizedStories;
  }

  await db
    .update(ideas)
    .set(updateValues)
    .where(and(eq(ideas.projectId, projectId), eq(ideas.id, ideaId)));

  const updatedIdea = await getIdeaById(projectId, ideaId, db);

  if (!updatedIdea) {
    return { error: "not_found" as const, idea: null };
  }

  return { error: null as UpdateProjectIdeaWorkspaceError, idea: updatedIdea };
}

export type ProjectIdea = Awaited<ReturnType<typeof listProjectIdeas>>[number];
export type ProjectIdeaDetail = Awaited<ReturnType<typeof getProjectIdeaById>>;

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
