import { randomUUID } from "node:crypto";

import { generateText, Output } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

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

const IDEA_MODEL = "anthropic/claude-sonnet-4.6";

type ConvertVisionToIdeaArgs = {
  roadmapItemId?: string;
  title?: string;
};

type IdeaGenerationInput = {
  context: string;
  sourceVisionTitle: string;
  title: string;
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

type UpdateIdeaDocumentsArgs = {
  specSheet?: string;
  userStories?: IdeaUserStory[];
};

type RegenerateIdeaDocumentsArgs = {
  specSheet?: boolean;
  userStories?: boolean;
};

type IdeaGenerationTargets = {
  specSheet: boolean;
  userStories: boolean;
};

const generatedIdeaDocumentsSchema = z.object({
  specSheet: z.string().trim().min(1).max(30000),
  userStories: z
    .array(
      z.object({
        outcome: z.string().trim().min(1).max(500),
        story: z.string().trim().min(1).max(500),
      }),
    )
    .min(4)
    .max(12),
});
const generatedSpecSheetSchema = z.object({
  specSheet: z.string().trim().min(1).max(30000),
});
const generatedUserStoriesSchema = z.object({
  userStories: z
    .array(
      z.object({
        outcome: z.string().trim().min(1).max(500),
        story: z.string().trim().min(1).max(500),
      }),
    )
    .min(4)
    .max(12),
});
const MAX_STORIES = 50;
const MAX_ID_LEN = 64;
const MAX_STORY_LEN = 2000;
const MAX_OUTCOME_LEN = 2000;

function normalizeIdeaTitle(title: string | undefined, fallback: string) {
  const trimmedTitle = title?.trim();

  return trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : fallback;
}

function normalizeIdeaUserStories(stories: IdeaUserStory[]) {
  return stories.map((story) => ({
    id: story.id.trim(),
    outcome: story.outcome.trim(),
    story: story.story.trim(),
  }));
}

function isValidIdeaUserStories(stories: IdeaUserStory[]) {
  if (stories.length > MAX_STORIES) {
    return false;
  }

  return stories.every((story) => {
    const normalizedId = story.id.trim();
    const normalizedStory = story.story.trim();
    const normalizedOutcome = story.outcome.trim();

    return (
      normalizedId.length > 0 &&
      normalizedId.length <= MAX_ID_LEN &&
      normalizedStory.length > 0 &&
      normalizedStory.length <= MAX_STORY_LEN &&
      normalizedOutcome.length > 0 &&
      normalizedOutcome.length <= MAX_OUTCOME_LEN
    );
  });
}

function buildFallbackSpecSheet(input: IdeaGenerationInput) {
  return [
    "# Spec Sheet",
    "",
    "## Problem",
    input.context.trim() || "Capture the core user problem and why this idea matters.",
    "",
    "## Goal",
    `Ship "${input.title}" as a clear next step from vision "${input.sourceVisionTitle}".`,
    "",
    "## Scope",
    "- Define MVP boundaries and the primary success path.",
    "- Identify key constraints and dependencies.",
    "",
    "## Success metrics",
    "- User reaches desired outcome faster with less friction.",
    "- Team can validate value with measurable usage signals.",
    "",
    "## Risks",
    "- Unknown technical constraints and integration costs.",
    "- Ambiguous user expectations without clear acceptance tests.",
  ].join("\n");
}

function buildFallbackUserStories(input: IdeaGenerationInput): IdeaUserStory[] {
  return [
    {
      id: randomUUID(),
      outcome: "align the team on scope and outcomes",
      story: "As a project owner, I want a concise spec sheet",
    },
    {
      id: randomUUID(),
      outcome: "implement increments without ambiguity",
      story: "As a collaborator, I want clear user stories",
    },
    {
      id: randomUUID(),
      outcome: "complete my goal with confidence",
      story: `As an end user impacted by ${input.title}, I want the core workflow to feel obvious`,
    },
    {
      id: randomUUID(),
      outcome: "track measurable impact",
      story: "As a product lead, I want explicit success metrics in the spec",
    },
  ];
}

async function generateIdeaDocuments(input: IdeaGenerationInput, targets: IdeaGenerationTargets) {
  if (targets.specSheet && targets.userStories) {
    try {
      const result = await generateText({
        model: IDEA_MODEL,
        output: Output.object({
          description:
            "A PRD-style spec sheet and actor-goal-benefit user stories for a project idea.",
          name: "ideaSpecAndStories",
          schema: generatedIdeaDocumentsSchema,
        }),
        prompt: [
          "Create an idea-level PRD-style spec sheet and user stories.",
          "Write concrete, concise markdown.",
          "Spec sheet sections: Problem, Goals, Non-goals, Scope, User flows, Risks, Success metrics.",
          'User stories must be actor-goal-benefit and use "As a..., I want..., so that...".',
          "Return 4 to 8 user stories.",
          `Idea title: ${input.title}`,
          `Source vision title: ${input.sourceVisionTitle}`,
          "Idea context:",
          input.context.trim() || "No context available.",
        ].join("\n"),
      });

      return {
        specSheet: result.output.specSheet,
        userStories: result.output.userStories.map((story) => ({
          id: randomUUID(),
          outcome: story.outcome,
          story: story.story,
        })),
      };
    } catch {
      return {
        specSheet: buildFallbackSpecSheet(input),
        userStories: buildFallbackUserStories(input),
      };
    }
  }

  if (targets.specSheet) {
    try {
      const result = await generateText({
        model: IDEA_MODEL,
        output: Output.object({
          description: "A PRD-style spec sheet for a project idea.",
          name: "ideaSpecSheet",
          schema: generatedSpecSheetSchema,
        }),
        prompt: [
          "Create an idea-level PRD-style spec sheet in markdown.",
          "Use sections: Problem, Goals, Non-goals, Scope, User flows, Risks, Success metrics.",
          `Idea title: ${input.title}`,
          `Source vision title: ${input.sourceVisionTitle}`,
          "Idea context:",
          input.context.trim() || "No context available.",
        ].join("\n"),
      });

      return { specSheet: result.output.specSheet };
    } catch {
      return { specSheet: buildFallbackSpecSheet(input) };
    }
  }

  if (targets.userStories) {
    try {
      const result = await generateText({
        model: IDEA_MODEL,
        output: Output.object({
          description: "Actor-goal-benefit user stories for a project idea.",
          name: "ideaUserStories",
          schema: generatedUserStoriesSchema,
        }),
        prompt: [
          "Create actor-goal-benefit user stories for this idea.",
          'Use format intent: "As a..., I want..., so that...".',
          "Return 4 to 8 user stories.",
          `Idea title: ${input.title}`,
          `Source vision title: ${input.sourceVisionTitle}`,
          "Idea context:",
          input.context.trim() || "No context available.",
        ].join("\n"),
      });

      return {
        userStories: result.output.userStories.map((story) => ({
          id: randomUUID(),
          outcome: story.outcome,
          story: story.story,
        })),
      };
    } catch {
      return { userStories: buildFallbackUserStories(input) };
    }
  }

  return {};
}

function getGenerationTargets(input: IdeaGenerationTargets) {
  return {
    specSheet: Boolean(input.specSheet),
    userStories: Boolean(input.userStories),
  };
}

async function generateIdeaDocumentsForTargets(
  input: IdeaGenerationInput,
  requestedTargets: IdeaGenerationTargets,
) {
  const targets = getGenerationTargets(requestedTargets);

  if (!targets.specSheet && !targets.userStories) {
    return {};
  }

  try {
    return await generateIdeaDocuments(input, targets);
  } catch {
    return {};
  }
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

  let normalizedStories: IdeaUserStory[] | undefined;

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
  const generated = await generateIdeaDocumentsForTargets(
    {
      context: summary,
      sourceVisionTitle: vision.title,
      title: nextTitle,
    },
    { specSheet: true, userStories: true },
  );

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
        specSheet:
          generated.specSheet ??
          buildFallbackSpecSheet({
            context: summary,
            sourceVisionTitle: vision.title,
            title: nextTitle,
          }),
        title: nextTitle,
        updatedAt: now,
        userStories:
          generated.userStories ??
          buildFallbackUserStories({
            context: summary,
            sourceVisionTitle: vision.title,
            title: nextTitle,
          }),
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

export async function updateIdeaDocuments(
  viewerId: string,
  projectId: string,
  ideaId: string,
  updates: UpdateIdeaDocumentsArgs,
  db: Database = getDb(),
) {
  if (updates.specSheet === undefined && updates.userStories === undefined) {
    return { error: "invalid_update" as const, idea: null };
  }

  const result = await updateProjectIdeaWorkspace(
    viewerId,
    projectId,
    ideaId,
    {
      specSheet: updates.specSheet,
      userStories: updates.userStories,
    },
    db,
  );

  if (result.error === "invalid_user_stories") {
    return { error: "invalid_update" as const, idea: null };
  }

  return result.error === null
    ? { error: null, idea: result.idea }
    : { error: result.error, idea: null };
}

export async function regenerateIdeaDocuments(
  viewerId: string,
  projectId: string,
  ideaId: string,
  options: RegenerateIdeaDocumentsArgs,
  db: Database = getDb(),
) {
  if (!options.specSheet && !options.userStories) {
    return { error: "invalid_update" as const, idea: null };
  }

  const existingIdea = await getProjectIdeaById(viewerId, projectId, ideaId, db);

  if (!existingIdea) {
    return { error: "not_found" as const, idea: null };
  }

  const regenerated = await generateIdeaDocumentsForTargets(
    {
      context: existingIdea.context,
      sourceVisionTitle: existingIdea.sourceVisionTitle,
      title: existingIdea.title,
    },
    {
      specSheet: Boolean(options.specSheet),
      userStories: Boolean(options.userStories),
    },
  );

  const result = await updateProjectIdeaWorkspace(
    viewerId,
    projectId,
    ideaId,
    {
      specSheet: options.specSheet ? regenerated.specSheet : undefined,
      userStories: options.userStories ? regenerated.userStories : undefined,
    },
    db,
  );

  return result.error === null
    ? { error: null, idea: result.idea }
    : { error: result.error, idea: null };
}
