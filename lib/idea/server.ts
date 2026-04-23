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

/**
 * Return the trimmed `title` when it contains non-whitespace characters, otherwise use `fallback`.
 *
 * @param title - The candidate title which may be `undefined` or contain surrounding whitespace.
 * @param fallback - The value to return when `title` is missing or empty after trimming.
 * @returns The trimmed `title` if it contains at least one character after trimming, otherwise `fallback`.
 */
function normalizeIdeaTitle(title: string | undefined, fallback: string) {
  const trimmedTitle = title?.trim();

  return trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : fallback;
}

/**
 * Validates that every idea user story contains a non-empty trimmed `id`, `story`, and `outcome`.
 *
 * @param stories - The array of idea user stories to validate
 * @returns `true` if every story's `id`, `story`, and `outcome` are non-empty after trimming, `false` otherwise.
 */
function isValidIdeaUserStories(stories: IdeaUserStory[]) {
  return stories.every((story) => {
    const normalizedId = story.id.trim();
    const normalizedStory = story.story.trim();
    const normalizedOutcome = story.outcome.trim();

    return normalizedId.length > 0 && normalizedStory.length > 0 && normalizedOutcome.length > 0;
  });
}

/**
 * Normalize idea user stories by trimming leading and trailing whitespace from each field.
 *
 * @param stories - Array of idea user story objects whose `id`, `story`, and `outcome` fields will be trimmed
 * @returns An array of idea user stories where each object's `id`, `story`, and `outcome` are trimmed
 */
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
/**
 * Builds a selection field map for querying idea rows, optionally including workspace fields.
 *
 * @param includeWorkspaceFields - When `true`, the returned map includes `specSheet` and `userStories`; when `false`, those workspace fields are omitted.
 * @returns A selection field map for ideas joined with users, visions, and roadmap items. When `includeWorkspaceFields` is `true`, the map also contains `specSheet` and `userStories`.
 */
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

/**
 * Fetches the summary row for an idea linked to a specific vision within a project.
 *
 * @param projectId - The project identifier to filter ideas by
 * @param visionId - The source vision identifier to find the linked idea
 * @returns The matching `IdeaSummaryRow` if found, otherwise `null`
 */
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

/**
 * Fetches the detailed idea record for a project by idea ID.
 *
 * @returns The idea detail row including workspace fields, or `null` if no matching idea exists.
 */
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

/**
 * Fetches the project's idea linked to a vision when the viewer has project access.
 *
 * @returns The idea summary row for the given vision, or `null` if access is denied or no idea exists.
 */
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

/**
 * Fetches a project's idea detail if the viewer has access.
 *
 * @param viewerId - ID of the requesting user
 * @param projectId - ID of the project containing the idea
 * @param ideaId - ID of the idea to retrieve
 * @returns The idea detail row including workspace fields, or `null` if access is denied or the idea does not exist
 */
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

/**
 * Lists summary information for ideas in a project that the viewer is allowed to see.
 *
 * @returns An array of idea summary rows for the given project; returns an empty array when the viewer has no access or there are no ideas.
 */
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

/**
 * Apply workspace-only updates to an existing project idea and return the refreshed idea.
 *
 * Updates permitted fields from `patch` (context, roadmap linkage, spec sheet, user stories), validates roadmap item membership and user stories, persists the changes, and returns the updated idea.
 *
 * @param patch - Patchable workspace fields: `context` (string), `roadmapItemId` (string | null), `specSheet` (string), and `userStories` (array of user-story objects). `roadmapItemId` is validated against the project's roadmap when provided; `userStories` must pass validation and will be normalized before saving.
 * @returns An object `{ error, idea }` where `idea` is the updated idea detail on success and `error` is one of:
 * - `"not_found"` when the project or idea does not exist or the updated idea cannot be loaded,
 * - `"invalid_roadmap_item"` when `roadmapItemId` is provided but does not belong to the project,
 * - `"invalid_user_stories"` when `userStories` is present but invalid,
 * - `null` on success.
 */
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

/**
 * Create an idea from an existing vision in the project when the viewer has sufficient project role.
 *
 * Attempts to create a new idea linked to `visionId` (using `title` as an override and optionally linking to
 * `roadmapItemId`) unless an idea for that vision already exists. On success returns the created or existing idea.
 *
 * @param {ConvertVisionToIdeaArgs} { roadmapItemId, title } - Optional conversion options: `roadmapItemId` links the new idea to a roadmap item if valid; `title` overrides the vision title.
 * @returns An object with:
 *  - `error`: `"not_found" | "forbidden" | "invalid_roadmap_item" | null` — `null` when conversion succeeded.
 *    - `"not_found"` if the project or vision is missing or the created idea cannot be retrieved after insertion.
 *    - `"forbidden"` if the viewer's project role does not permit conversion.
 *    - `"invalid_roadmap_item"` if a provided `roadmapItemId` does not belong to the project's roadmap.
 *  - `idea`: the resulting idea detail when `error` is `null`, otherwise `null`.
 */
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
