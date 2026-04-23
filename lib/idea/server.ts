import { randomUUID } from "node:crypto";

import { generateText, Output } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { ideas, roadmapItems, users, visionSummaryDocuments, visions } from "@/drizzle/schema";
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

type RegenerateIdeaDocumentsArgs = {
  specSheet?: boolean;
  userStories?: boolean;
};

type UpdateIdeaDocumentsArgs = {
  specSheet?: string;
  userStories?: string;
};

type IdeaGenerationInput = {
  context: string;
  sourceVisionTitle: string;
  title: string;
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
  specSheet: string;
  title: string;
  updatedAt: Date;
  userStories: string;
};

const generatedIdeaDocumentsSchema = z.object({
  specSheet: z.string().trim().min(1).max(30000),
  userStories: z.string().trim().min(1).max(30000),
});

export type ProjectIdea = Awaited<ReturnType<typeof listProjectIdeas>>[number];

function normalizeIdeaTitle(title: string | undefined, fallback: string) {
  const trimmedTitle = title?.trim();

  return trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : fallback;
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

function buildFallbackUserStories(input: IdeaGenerationInput) {
  return [
    "- As a project owner, I want a concise spec sheet, so that I can align the team on scope and outcomes.",
    "- As a collaborator, I want clear user stories, so that I can implement increments without ambiguity.",
    `- As an end user impacted by "${input.title}", I want the core workflow to feel obvious, so that I can complete my goal with confidence.`,
  ].join("\n");
}

async function generateIdeaDocuments(input: IdeaGenerationInput) {
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
        "User stories must be actor-goal-benefit statements and each must start with 'As a ...'.",
        "Return at least 4 user stories.",
        `Idea title: ${input.title}`,
        `Source vision title: ${input.sourceVisionTitle}`,
        "Idea context:",
        input.context.trim() || "No context available.",
      ].join("\n"),
    });

    return result.output;
  } catch {
    return {
      specSheet: buildFallbackSpecSheet(input),
      userStories: buildFallbackUserStories(input),
    };
  }
}

async function getIdeaByIdInProject(
  projectId: string,
  ideaId: string,
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
      specSheet: ideas.specSheet,
      title: ideas.title,
      updatedAt: ideas.updatedAt,
      userStories: ideas.userStories,
    })
    .from(ideas)
    .innerJoin(users, eq(users.id, ideas.createdByUserId))
    .innerJoin(visions, eq(visions.id, ideas.sourceVisionId))
    .leftJoin(roadmapItems, eq(roadmapItems.id, ideas.roadmapItemId))
    .where(and(eq(ideas.projectId, projectId), eq(ideas.id, ideaId)))
    .limit(1);

  return rows[0] ?? null;
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
      specSheet: ideas.specSheet,
      title: ideas.title,
      updatedAt: ideas.updatedAt,
      userStories: ideas.userStories,
    })
    .from(ideas)
    .innerJoin(users, eq(users.id, ideas.createdByUserId))
    .innerJoin(visions, eq(visions.id, ideas.sourceVisionId))
    .leftJoin(roadmapItems, eq(roadmapItems.id, ideas.roadmapItemId))
    .where(and(eq(ideas.projectId, projectId), eq(ideas.sourceVisionId, visionId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getIdeaById(
  viewerId: string,
  projectId: string,
  ideaId: string,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return null;
  }

  return getIdeaByIdInProject(projectId, ideaId, db);
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
      specSheet: ideas.specSheet,
      title: ideas.title,
      updatedAt: ideas.updatedAt,
      userStories: ideas.userStories,
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
  const generated = await generateIdeaDocuments({
    context: summary,
    sourceVisionTitle: vision.title,
    title: nextTitle,
  });

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
        specSheet: generated.specSheet,
        title: nextTitle,
        updatedAt: now,
        userStories: generated.userStories,
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
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return { error: "not_found" as const, idea: null };
  }

  if (updates.specSheet === undefined && updates.userStories === undefined) {
    return { error: "invalid_update" as const, idea: null };
  }

  const existingIdea = await getIdeaByIdInProject(projectId, ideaId, db);

  if (!existingIdea) {
    return { error: "not_found" as const, idea: null };
  }

  await db
    .update(ideas)
    .set({
      specSheet: updates.specSheet ?? existingIdea.specSheet,
      updatedAt: new Date(),
      userStories: updates.userStories ?? existingIdea.userStories,
    })
    .where(and(eq(ideas.projectId, projectId), eq(ideas.id, ideaId)));

  const idea = await getIdeaById(viewerId, projectId, ideaId, db);

  if (!idea) {
    return { error: "not_found" as const, idea: null };
  }

  return { error: null, idea };
}

export async function regenerateIdeaDocuments(
  viewerId: string,
  projectId: string,
  ideaId: string,
  options: RegenerateIdeaDocumentsArgs,
  db: Database = getDb(),
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return { error: "not_found" as const, idea: null };
  }

  const existingIdea = await getIdeaByIdInProject(projectId, ideaId, db);

  if (!existingIdea) {
    return { error: "not_found" as const, idea: null };
  }

  if (!options.specSheet && !options.userStories) {
    return { error: "invalid_update" as const, idea: null };
  }

  const regenerated = await generateIdeaDocuments({
    context: existingIdea.context,
    sourceVisionTitle: existingIdea.sourceVisionTitle,
    title: existingIdea.title,
  });

  await db
    .update(ideas)
    .set({
      specSheet: options.specSheet ? regenerated.specSheet : existingIdea.specSheet,
      updatedAt: new Date(),
      userStories: options.userStories ? regenerated.userStories : existingIdea.userStories,
    })
    .where(and(eq(ideas.projectId, projectId), eq(ideas.id, ideaId)));

  const idea = await getIdeaById(viewerId, projectId, ideaId, db);

  if (!idea) {
    return { error: "not_found" as const, idea: null };
  }

  return { error: null, idea };
}
