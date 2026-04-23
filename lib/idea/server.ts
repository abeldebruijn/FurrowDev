import { randomUUID } from "node:crypto";

import { generateText, Output } from "ai";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import {
  ideas,
  type IdeaTaskMetadata,
  type IdeaUserStory,
  ideaSubtaskDependencies,
  ideaSubtasks,
  ideaTaskDependencies,
  ideaTasks,
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

export type IdeaTaskDependency = {
  id: string;
  title: string;
};

export type IdeaSubtaskDetail = {
  completedAt: Date | null;
  createdAt: Date;
  dependencies: IdeaTaskDependency[];
  description: string;
  id: string;
  isDone: boolean;
  metadata: IdeaTaskMetadata;
  position: number;
  taskId: string;
  title: string;
  updatedAt: Date;
};

export type IdeaTaskDetail = {
  createdAt: Date;
  dependencies: IdeaTaskDependency[];
  description: string;
  id: string;
  ideaId: string;
  isDone: boolean;
  metadata: IdeaTaskMetadata;
  position: number;
  subtasks: IdeaSubtaskDetail[];
  title: string;
  updatedAt: Date;
};

type IdeaDetailRow = IdeaRowBase & {
  isDone: boolean;
  tasks: IdeaTaskDetail[];
};

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

type ProjectIdeaTaskPatch = {
  dependencies?: string[];
  description?: string;
  metadata?: IdeaTaskMetadata;
  position?: number;
  title?: string;
};

type ProjectIdeaSubtaskPatch = ProjectIdeaTaskPatch & {
  completed?: boolean;
};

type ProjectIdeaTaskMutationError = "invalid_dependency" | "invalid_metadata" | "not_found" | null;

type ProjectIdeaSubtaskMutationError =
  | "invalid_dependency"
  | "invalid_metadata"
  | "not_found"
  | null;

type ProjectIdeaReorderError = "invalid_order" | "not_found" | null;

export type GeneratedIdeaTaskTitle = {
  key: string;
  title: string;
};

export type GeneratedIdeaSubtaskDraft = {
  dependencies: string[];
  description: string;
  key: string;
  metadata: IdeaTaskMetadata;
  title: string;
};

export type GeneratedIdeaTaskDraft = {
  dependencies: string[];
  description: string;
  key: string;
  metadata: IdeaTaskMetadata;
  subtasks: GeneratedIdeaSubtaskDraft[];
  title: string;
};

export type GeneratedIdeaTaskApplyMode = "append" | "replace_all" | "replace_empty";

type GeneratedIdeaTaskError =
  | "invalid_dependency"
  | "invalid_metadata"
  | "invalid_payload"
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
const generatedTaskTitlesSchema = z.object({
  tasks: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(80),
        title: z.string().trim().min(1).max(160),
      }),
    )
    .min(1)
    .max(20),
});
const generatedTaskDetailsSchema = z.object({
  tasks: z
    .array(
      z.object({
        dependencies: z.array(z.string().trim().min(1).max(80)).default([]),
        description: z.string().trim().max(2000).default(""),
        key: z.string().trim().min(1).max(80),
        metadata: z.record(z.string(), z.unknown()).default({}),
        subtasks: z
          .array(
            z.object({
              dependencies: z.array(z.string().trim().min(1).max(80)).default([]),
              description: z.string().trim().max(2000).default(""),
              key: z.string().trim().min(1).max(80),
              metadata: z.record(z.string(), z.unknown()).default({}),
              title: z.string().trim().min(1).max(180),
            }),
          )
          .min(1)
          .max(12),
        title: z.string().trim().min(1).max(160),
      }),
    )
    .min(1)
    .max(20),
});
const MAX_STORIES = 50;
const MAX_ID_LEN = 64;
const MAX_STORY_LEN = 2000;
const MAX_OUTCOME_LEN = 2000;

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

function normalizeIdeaUserStories(stories: IdeaUserStory[]) {
  return stories.map((story) => ({
    id: story.id.trim(),
    outcome: story.outcome.trim(),
    story: story.story.trim(),
  }));
}

function isPlainMetadata(value: unknown): value is IdeaTaskMetadata {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function normalizeMetadata(value: IdeaTaskMetadata | undefined) {
  return value === undefined ? undefined : value;
}

function hasExactlySameIds(expectedIds: string[], actualIds: string[]) {
  if (expectedIds.length !== actualIds.length) {
    return false;
  }

  const expectedIdSet = new Set(expectedIds);
  const actualIdSet = new Set(actualIds);

  return expectedIdSet.size === actualIdSet.size && actualIds.every((id) => expectedIdSet.has(id));
}

async function lockPositionScope(tx: Transaction, scopeId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${scopeId}))`);
}

function normalizeTitle(title: string | undefined, fallback: string) {
  const trimmed = title?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function normalizeGeneratedKey(value: string, fallback: string) {
  const trimmed = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return trimmed || fallback;
}

function normalizeGeneratedTaskTitles(tasks: GeneratedIdeaTaskTitle[]) {
  const seenKeys = new Set<string>();

  return tasks.map((task, index) => {
    const fallbackKey = `task-${index + 1}`;
    let key = normalizeGeneratedKey(task.key, fallbackKey);

    if (seenKeys.has(key)) {
      key = `${key}-${index + 1}`;
    }

    seenKeys.add(key);

    return {
      key,
      title: normalizeTitle(task.title, `Task ${index + 1}`),
    };
  });
}

function normalizeGeneratedTaskDrafts(tasks: GeneratedIdeaTaskDraft[]) {
  const taskKeys = new Set<string>();

  return tasks.map((task, taskIndex) => {
    const fallbackKey = `task-${taskIndex + 1}`;
    let taskKey = normalizeGeneratedKey(task.key, fallbackKey);

    if (taskKeys.has(taskKey)) {
      taskKey = `${taskKey}-${taskIndex + 1}`;
    }

    taskKeys.add(taskKey);

    const subtaskKeys = new Set<string>();
    const subtasks = task.subtasks.map((subtask, subtaskIndex) => {
      const subtaskFallbackKey = `${taskKey}-subtask-${subtaskIndex + 1}`;
      let subtaskKey = normalizeGeneratedKey(subtask.key, subtaskFallbackKey);

      if (subtaskKeys.has(subtaskKey)) {
        subtaskKey = `${subtaskKey}-${subtaskIndex + 1}`;
      }

      subtaskKeys.add(subtaskKey);

      return {
        dependencies: Array.from(
          new Set(
            subtask.dependencies.map((dependency) => normalizeGeneratedKey(dependency, dependency)),
          ),
        ),
        description: subtask.description.trim(),
        key: subtaskKey,
        metadata: subtask.metadata,
        title: normalizeTitle(subtask.title, `SubTask ${subtaskIndex + 1}`),
      };
    });

    return {
      dependencies: Array.from(
        new Set(
          task.dependencies.map((dependency) => normalizeGeneratedKey(dependency, dependency)),
        ),
      ),
      description: task.description.trim(),
      key: taskKey,
      metadata: task.metadata,
      subtasks,
      title: normalizeTitle(task.title, `Task ${taskIndex + 1}`),
    };
  });
}

function validateGeneratedTaskDrafts(tasks: GeneratedIdeaTaskDraft[]) {
  const taskKeys = new Set(tasks.map((task) => task.key));

  for (const task of tasks) {
    if (!isPlainMetadata(task.metadata)) {
      return "invalid_metadata" as const;
    }

    for (const dependency of task.dependencies) {
      if (dependency === task.key || !taskKeys.has(dependency)) {
        return "invalid_dependency" as const;
      }
    }

    const subtaskKeys = new Set(task.subtasks.map((subtask) => subtask.key));

    for (const subtask of task.subtasks) {
      if (!isPlainMetadata(subtask.metadata)) {
        return "invalid_metadata" as const;
      }

      for (const dependency of subtask.dependencies) {
        if (dependency === subtask.key || !subtaskKeys.has(dependency)) {
          return "invalid_dependency" as const;
        }
      }
    }
  }

  return null;
}

function summarizeIdeaForTaskGeneration(idea: IdeaDetailRow) {
  const userStories =
    idea.userStories.length === 0
      ? "No user stories."
      : idea.userStories
          .map((story, index) => `${index + 1}. ${story.story}\nOutcome: ${story.outcome}`)
          .join("\n");
  const existingTasks =
    idea.tasks.length === 0
      ? "No existing tasks."
      : idea.tasks
          .map(
            (task, index) =>
              `${index + 1}. ${task.title} (${task.subtasks.length} subtasks, ${
                task.isDone ? "done" : "not done"
              })`,
          )
          .join("\n");

  return [
    `Idea title: ${idea.title}`,
    `Source vision: ${idea.sourceVisionTitle}`,
    idea.roadmapItemName
      ? `Roadmap item: v${idea.roadmapItemMajorVersion}.${idea.roadmapItemMinorVersion} - ${idea.roadmapItemName}`
      : "Roadmap item: none",
    "Idea context:",
    idea.context.trim() || "No context.",
    "Spec sheet:",
    idea.specSheet.trim() || "No spec sheet.",
    "User stories:",
    userStories,
    "Existing tasks:",
    existingTasks,
  ].join("\n\n");
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

  const idea = rows[0] ?? null;

  if (!idea) {
    return null;
  }

  const tasks = await listIdeaTasks(ideaId, db);

  return {
    ...idea,
    isDone: tasks.length > 0 && tasks.every((task) => task.isDone),
    tasks,
  };
}

async function getIdeaBaseById(
  projectId: string,
  ideaId: string,
  db: Queryable = getDb(),
): Promise<IdeaRowBase | null> {
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

async function listIdeaTasks(ideaId: string, db: Queryable = getDb()): Promise<IdeaTaskDetail[]> {
  const taskRows = await db
    .select({
      createdAt: ideaTasks.createdAt,
      description: ideaTasks.description,
      id: ideaTasks.id,
      ideaId: ideaTasks.ideaId,
      metadata: ideaTasks.metadata,
      position: ideaTasks.position,
      title: ideaTasks.title,
      updatedAt: ideaTasks.updatedAt,
    })
    .from(ideaTasks)
    .where(eq(ideaTasks.ideaId, ideaId))
    .orderBy(asc(ideaTasks.position), asc(ideaTasks.createdAt), asc(ideaTasks.title));

  if (taskRows.length === 0) {
    return [];
  }

  const taskIds = taskRows.map((task) => task.id);
  const [subtaskRows, taskDependencyRows] = await Promise.all([
    db
      .select({
        completedAt: ideaSubtasks.completedAt,
        createdAt: ideaSubtasks.createdAt,
        description: ideaSubtasks.description,
        id: ideaSubtasks.id,
        metadata: ideaSubtasks.metadata,
        position: ideaSubtasks.position,
        taskId: ideaSubtasks.taskId,
        title: ideaSubtasks.title,
        updatedAt: ideaSubtasks.updatedAt,
      })
      .from(ideaSubtasks)
      .where(inArray(ideaSubtasks.taskId, taskIds))
      .orderBy(asc(ideaSubtasks.position), asc(ideaSubtasks.createdAt), asc(ideaSubtasks.title)),
    db
      .select({
        dependsOnTaskId: ideaTaskDependencies.dependsOnTaskId,
        taskId: ideaTaskDependencies.taskId,
      })
      .from(ideaTaskDependencies)
      .where(inArray(ideaTaskDependencies.taskId, taskIds))
      .orderBy(asc(ideaTaskDependencies.taskId), asc(ideaTaskDependencies.dependsOnTaskId)),
  ]);

  const subtaskIds = subtaskRows.map((subtask) => subtask.id);
  const subtaskDependencyRows =
    subtaskIds.length === 0
      ? []
      : await db
          .select({
            dependsOnSubtaskId: ideaSubtaskDependencies.dependsOnSubtaskId,
            subtaskId: ideaSubtaskDependencies.subtaskId,
          })
          .from(ideaSubtaskDependencies)
          .where(inArray(ideaSubtaskDependencies.subtaskId, subtaskIds))
          .orderBy(
            asc(ideaSubtaskDependencies.subtaskId),
            asc(ideaSubtaskDependencies.dependsOnSubtaskId),
          );

  const taskTitleById = new Map(taskRows.map((task) => [task.id, task.title]));
  const subtaskTitleById = new Map(subtaskRows.map((subtask) => [subtask.id, subtask.title]));
  const taskDependenciesById = new Map<string, IdeaTaskDependency[]>();
  const subtaskDependenciesById = new Map<string, IdeaTaskDependency[]>();

  for (const dependency of taskDependencyRows) {
    const dependencies = taskDependenciesById.get(dependency.taskId) ?? [];
    dependencies.push({
      id: dependency.dependsOnTaskId,
      title: taskTitleById.get(dependency.dependsOnTaskId) ?? "Unknown task",
    });
    taskDependenciesById.set(dependency.taskId, dependencies);
  }

  for (const dependency of subtaskDependencyRows) {
    const dependencies = subtaskDependenciesById.get(dependency.subtaskId) ?? [];
    dependencies.push({
      id: dependency.dependsOnSubtaskId,
      title: subtaskTitleById.get(dependency.dependsOnSubtaskId) ?? "Unknown subtask",
    });
    subtaskDependenciesById.set(dependency.subtaskId, dependencies);
  }

  const subtasksByTaskId = new Map<string, IdeaSubtaskDetail[]>();

  for (const subtask of subtaskRows) {
    const subtasks = subtasksByTaskId.get(subtask.taskId) ?? [];
    subtasks.push({
      completedAt: subtask.completedAt,
      createdAt: subtask.createdAt,
      dependencies: subtaskDependenciesById.get(subtask.id) ?? [],
      description: subtask.description,
      id: subtask.id,
      isDone: Boolean(subtask.completedAt),
      metadata: subtask.metadata,
      position: subtask.position,
      taskId: subtask.taskId,
      title: subtask.title,
      updatedAt: subtask.updatedAt,
    });
    subtasksByTaskId.set(subtask.taskId, subtasks);
  }

  return taskRows.map((task) => {
    const subtasks = subtasksByTaskId.get(task.id) ?? [];

    return {
      createdAt: task.createdAt,
      dependencies: taskDependenciesById.get(task.id) ?? [],
      description: task.description,
      id: task.id,
      ideaId: task.ideaId,
      isDone: subtasks.length > 0 && subtasks.every((subtask) => subtask.isDone),
      metadata: task.metadata,
      position: task.position,
      subtasks,
      title: task.title,
      updatedAt: task.updatedAt,
    };
  });
}

async function getAccessibleIdeaBase(
  viewerId: string,
  projectId: string,
  ideaId: string,
  db: Database,
) {
  const project = await getProjectAccess(viewerId, projectId, db);

  if (!project) {
    return null;
  }

  const idea = await getIdeaBaseById(projectId, ideaId, db);

  if (!idea) {
    return null;
  }

  return { idea, project };
}

async function getTaskForIdea(ideaId: string, taskId: string, db: Queryable) {
  const rows = await db
    .select({
      id: ideaTasks.id,
      ideaId: ideaTasks.ideaId,
    })
    .from(ideaTasks)
    .where(and(eq(ideaTasks.ideaId, ideaId), eq(ideaTasks.id, taskId)))
    .limit(1);

  return rows[0] ?? null;
}

async function getSubtaskForTask(taskId: string, subtaskId: string, db: Queryable) {
  const rows = await db
    .select({
      id: ideaSubtasks.id,
      taskId: ideaSubtasks.taskId,
    })
    .from(ideaSubtasks)
    .where(and(eq(ideaSubtasks.taskId, taskId), eq(ideaSubtasks.id, subtaskId)))
    .limit(1);

  return rows[0] ?? null;
}

async function validateTaskDependencies(
  ideaId: string,
  taskId: string,
  dependencyIds: string[],
  db: Queryable,
) {
  if (dependencyIds.includes(taskId)) {
    return false;
  }

  if (dependencyIds.length === 0) {
    return true;
  }

  const taskRows = await db
    .select({
      id: ideaTasks.id,
    })
    .from(ideaTasks)
    .where(eq(ideaTasks.ideaId, ideaId))
    .orderBy(asc(ideaTasks.id));
  const validTaskIds = new Set(taskRows.map((task) => task.id));

  return dependencyIds.every((dependencyId) => validTaskIds.has(dependencyId));
}

async function validateSubtaskDependencies(
  taskId: string,
  subtaskId: string,
  dependencyIds: string[],
  db: Queryable,
) {
  if (dependencyIds.includes(subtaskId)) {
    return false;
  }

  if (dependencyIds.length === 0) {
    return true;
  }

  const subtaskRows = await db
    .select({
      id: ideaSubtasks.id,
    })
    .from(ideaSubtasks)
    .where(eq(ideaSubtasks.taskId, taskId))
    .orderBy(asc(ideaSubtasks.id));
  const validSubtaskIds = new Set(subtaskRows.map((subtask) => subtask.id));

  return dependencyIds.every((dependencyId) => validSubtaskIds.has(dependencyId));
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

  const idea = await getIdeaBaseById(projectId, ideaId, db);

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

export async function createProjectIdeaTask(
  viewerId: string,
  projectId: string,
  ideaId: string,
  patch: ProjectIdeaTaskPatch,
  db: Database = getDb(),
) {
  const access = await getAccessibleIdeaBase(viewerId, projectId, ideaId, db);

  if (!access) {
    return { error: "not_found" as const, idea: null };
  }

  const metadata = normalizeMetadata(patch.metadata);

  if (metadata !== undefined && !isPlainMetadata(metadata)) {
    return { error: "invalid_metadata" as const, idea: null };
  }

  const taskId = randomUUID();

  if (
    patch.dependencies &&
    !(await validateTaskDependencies(ideaId, taskId, patch.dependencies, db))
  ) {
    return { error: "invalid_dependency" as const, idea: null };
  }

  await db.transaction(async (tx) => {
    await lockPositionScope(tx, ideaId);

    const position: number =
      patch.position ??
      (await tx
        .select({
          position: ideaTasks.position,
        })
        .from(ideaTasks)
        .where(eq(ideaTasks.ideaId, ideaId))
        .orderBy(desc(ideaTasks.position))
        .then((rows) => (rows[0]?.position ?? -1) + 1));

    const values: typeof ideaTasks.$inferInsert = {
      description: patch.description ?? "",
      id: taskId,
      ideaId,
      metadata: metadata ?? {},
      position,
      title: normalizeTitle(patch.title, "Untitled task"),
    };

    await tx.insert(ideaTasks).values(values);

    if (patch.dependencies && patch.dependencies.length > 0) {
      await tx.insert(ideaTaskDependencies).values(
        patch.dependencies.map((dependencyId) => ({
          dependsOnTaskId: dependencyId,
          taskId,
        })),
      );
    }
  });

  return {
    error: null as ProjectIdeaTaskMutationError,
    idea: await getIdeaById(projectId, ideaId, db),
  };
}

export async function updateProjectIdeaTask(
  viewerId: string,
  projectId: string,
  ideaId: string,
  taskId: string,
  patch: ProjectIdeaTaskPatch,
  db: Database = getDb(),
) {
  const access = await getAccessibleIdeaBase(viewerId, projectId, ideaId, db);

  if (!access || !(await getTaskForIdea(ideaId, taskId, db))) {
    return { error: "not_found" as const, idea: null };
  }

  const metadata = normalizeMetadata(patch.metadata);

  if (metadata !== undefined && !isPlainMetadata(metadata)) {
    return { error: "invalid_metadata" as const, idea: null };
  }

  if (
    patch.dependencies &&
    !(await validateTaskDependencies(ideaId, taskId, patch.dependencies, db))
  ) {
    return { error: "invalid_dependency" as const, idea: null };
  }

  const updateValues: Partial<{
    description: string;
    metadata: IdeaTaskMetadata;
    position: number;
    title: string;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  if (patch.title !== undefined) {
    updateValues.title = normalizeTitle(patch.title, "Untitled task");
  }

  if (patch.description !== undefined) {
    updateValues.description = patch.description;
  }

  if (patch.position !== undefined) {
    updateValues.position = patch.position;
  }

  if (metadata !== undefined) {
    updateValues.metadata = metadata;
  }

  await db.transaction(async (tx) => {
    await tx.update(ideaTasks).set(updateValues).where(eq(ideaTasks.id, taskId));

    if (patch.dependencies !== undefined) {
      await tx.delete(ideaTaskDependencies).where(eq(ideaTaskDependencies.taskId, taskId));

      if (patch.dependencies.length > 0) {
        await tx.insert(ideaTaskDependencies).values(
          patch.dependencies.map((dependencyId) => ({
            dependsOnTaskId: dependencyId,
            taskId,
          })),
        );
      }
    }
  });

  return {
    error: null as ProjectIdeaTaskMutationError,
    idea: await getIdeaById(projectId, ideaId, db),
  };
}

export async function deleteProjectIdeaTask(
  viewerId: string,
  projectId: string,
  ideaId: string,
  taskId: string,
  db: Database = getDb(),
) {
  const access = await getAccessibleIdeaBase(viewerId, projectId, ideaId, db);

  if (!access || !(await getTaskForIdea(ideaId, taskId, db))) {
    return { error: "not_found" as const, idea: null };
  }

  await db.delete(ideaTasks).where(eq(ideaTasks.id, taskId));

  return {
    error: null as ProjectIdeaTaskMutationError,
    idea: await getIdeaById(projectId, ideaId, db),
  };
}

export async function reorderProjectIdeaTasks(
  viewerId: string,
  projectId: string,
  ideaId: string,
  taskIds: string[],
  db: Database = getDb(),
) {
  const access = await getAccessibleIdeaBase(viewerId, projectId, ideaId, db);

  if (!access) {
    return { error: "not_found" as const, idea: null };
  }

  const existingTasks = await db
    .select({
      id: ideaTasks.id,
    })
    .from(ideaTasks)
    .where(eq(ideaTasks.ideaId, ideaId))
    .orderBy(asc(ideaTasks.position), asc(ideaTasks.createdAt), asc(ideaTasks.title));

  if (
    !hasExactlySameIds(
      existingTasks.map((task) => task.id),
      taskIds,
    )
  ) {
    return { error: "invalid_order" as const, idea: null };
  }

  await db.transaction(async (tx) => {
    await lockPositionScope(tx, ideaId);

    for (const [position, taskId] of taskIds.entries()) {
      await tx
        .update(ideaTasks)
        .set({ position, updatedAt: new Date() })
        .where(and(eq(ideaTasks.ideaId, ideaId), eq(ideaTasks.id, taskId)));
    }
  });

  return {
    error: null as ProjectIdeaReorderError,
    idea: await getIdeaById(projectId, ideaId, db),
  };
}

export async function createProjectIdeaSubtask(
  viewerId: string,
  projectId: string,
  ideaId: string,
  taskId: string,
  patch: ProjectIdeaSubtaskPatch,
  db: Database = getDb(),
) {
  const access = await getAccessibleIdeaBase(viewerId, projectId, ideaId, db);

  if (!access || !(await getTaskForIdea(ideaId, taskId, db))) {
    return { error: "not_found" as const, idea: null };
  }

  const metadata = normalizeMetadata(patch.metadata);

  if (metadata !== undefined && !isPlainMetadata(metadata)) {
    return { error: "invalid_metadata" as const, idea: null };
  }

  const subtaskId = randomUUID();

  if (
    patch.dependencies &&
    !(await validateSubtaskDependencies(taskId, subtaskId, patch.dependencies, db))
  ) {
    return { error: "invalid_dependency" as const, idea: null };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await lockPositionScope(tx, taskId);

    const position: number =
      patch.position ??
      (await tx
        .select({
          position: ideaSubtasks.position,
        })
        .from(ideaSubtasks)
        .where(eq(ideaSubtasks.taskId, taskId))
        .orderBy(desc(ideaSubtasks.position))
        .then((rows) => (rows[0]?.position ?? -1) + 1));

    const values: typeof ideaSubtasks.$inferInsert = {
      completedAt: patch.completed ? now : null,
      description: patch.description ?? "",
      id: subtaskId,
      metadata: metadata ?? {},
      position,
      taskId,
      title: normalizeTitle(patch.title, "Untitled subtask"),
    };

    await tx.insert(ideaSubtasks).values(values);

    if (patch.dependencies && patch.dependencies.length > 0) {
      await tx.insert(ideaSubtaskDependencies).values(
        patch.dependencies.map((dependencyId) => ({
          dependsOnSubtaskId: dependencyId,
          subtaskId,
        })),
      );
    }
  });

  return {
    error: null as ProjectIdeaSubtaskMutationError,
    idea: await getIdeaById(projectId, ideaId, db),
  };
}

export async function updateProjectIdeaSubtask(
  viewerId: string,
  projectId: string,
  ideaId: string,
  taskId: string,
  subtaskId: string,
  patch: ProjectIdeaSubtaskPatch,
  db: Database = getDb(),
) {
  const access = await getAccessibleIdeaBase(viewerId, projectId, ideaId, db);

  if (
    !access ||
    !(await getTaskForIdea(ideaId, taskId, db)) ||
    !(await getSubtaskForTask(taskId, subtaskId, db))
  ) {
    return { error: "not_found" as const, idea: null };
  }

  const metadata = normalizeMetadata(patch.metadata);

  if (metadata !== undefined && !isPlainMetadata(metadata)) {
    return { error: "invalid_metadata" as const, idea: null };
  }

  if (
    patch.dependencies &&
    !(await validateSubtaskDependencies(taskId, subtaskId, patch.dependencies, db))
  ) {
    return { error: "invalid_dependency" as const, idea: null };
  }

  const now = new Date();
  const updateValues: Partial<{
    completedAt: Date | null;
    description: string;
    metadata: IdeaTaskMetadata;
    position: number;
    title: string;
    updatedAt: Date;
  }> = {
    updatedAt: now,
  };

  if (patch.title !== undefined) {
    updateValues.title = normalizeTitle(patch.title, "Untitled subtask");
  }

  if (patch.description !== undefined) {
    updateValues.description = patch.description;
  }

  if (patch.position !== undefined) {
    updateValues.position = patch.position;
  }

  if (metadata !== undefined) {
    updateValues.metadata = metadata;
  }

  if (patch.completed !== undefined) {
    updateValues.completedAt = patch.completed ? now : null;
  }

  await db.transaction(async (tx) => {
    await tx.update(ideaSubtasks).set(updateValues).where(eq(ideaSubtasks.id, subtaskId));

    if (patch.dependencies !== undefined) {
      await tx
        .delete(ideaSubtaskDependencies)
        .where(eq(ideaSubtaskDependencies.subtaskId, subtaskId));

      if (patch.dependencies.length > 0) {
        await tx.insert(ideaSubtaskDependencies).values(
          patch.dependencies.map((dependencyId) => ({
            dependsOnSubtaskId: dependencyId,
            subtaskId,
          })),
        );
      }
    }
  });

  return {
    error: null as ProjectIdeaSubtaskMutationError,
    idea: await getIdeaById(projectId, ideaId, db),
  };
}

export async function deleteProjectIdeaSubtask(
  viewerId: string,
  projectId: string,
  ideaId: string,
  taskId: string,
  subtaskId: string,
  db: Database = getDb(),
) {
  const access = await getAccessibleIdeaBase(viewerId, projectId, ideaId, db);

  if (
    !access ||
    !(await getTaskForIdea(ideaId, taskId, db)) ||
    !(await getSubtaskForTask(taskId, subtaskId, db))
  ) {
    return { error: "not_found" as const, idea: null };
  }

  await db.delete(ideaSubtasks).where(eq(ideaSubtasks.id, subtaskId));

  return {
    error: null as ProjectIdeaSubtaskMutationError,
    idea: await getIdeaById(projectId, ideaId, db),
  };
}

export async function reorderProjectIdeaSubtasks(
  viewerId: string,
  projectId: string,
  ideaId: string,
  taskId: string,
  subtaskIds: string[],
  db: Database = getDb(),
) {
  const access = await getAccessibleIdeaBase(viewerId, projectId, ideaId, db);

  if (!access || !(await getTaskForIdea(ideaId, taskId, db))) {
    return { error: "not_found" as const, idea: null };
  }

  const existingSubtasks = await db
    .select({
      id: ideaSubtasks.id,
    })
    .from(ideaSubtasks)
    .where(eq(ideaSubtasks.taskId, taskId))
    .orderBy(asc(ideaSubtasks.position), asc(ideaSubtasks.createdAt), asc(ideaSubtasks.title));

  if (
    !hasExactlySameIds(
      existingSubtasks.map((subtask) => subtask.id),
      subtaskIds,
    )
  ) {
    return { error: "invalid_order" as const, idea: null };
  }

  await db.transaction(async (tx) => {
    await lockPositionScope(tx, taskId);

    for (const [position, subtaskId] of subtaskIds.entries()) {
      await tx
        .update(ideaSubtasks)
        .set({ position, updatedAt: new Date() })
        .where(and(eq(ideaSubtasks.taskId, taskId), eq(ideaSubtasks.id, subtaskId)));
    }
  });

  return {
    error: null as ProjectIdeaReorderError,
    idea: await getIdeaById(projectId, ideaId, db),
  };
}

function buildFallbackTaskTitles(idea: IdeaDetailRow): GeneratedIdeaTaskTitle[] {
  const storyTitles = idea.userStories.slice(0, 6).map((story, index) => ({
    key: `task-${index + 1}`,
    title:
      story.story.replace(/^as an? .*?, i want to?/i, "").trim() || `Deliver story ${index + 1}`,
  }));

  return normalizeGeneratedTaskTitles(
    storyTitles.length > 0
      ? storyTitles
      : [
          { key: "task-1", title: "Confirm implementation scope" },
          { key: "task-2", title: "Build the core workflow" },
          { key: "task-3", title: "Validate the delivery" },
        ],
  );
}

function buildFallbackTaskDetails(titles: GeneratedIdeaTaskTitle[]): GeneratedIdeaTaskDraft[] {
  return normalizeGeneratedTaskDrafts(
    titles.map((task, index) => ({
      dependencies: index === 0 ? [] : [titles[index - 1]?.key ?? ""].filter(Boolean),
      description: `Deliver ${task.title}.`,
      key: task.key,
      metadata: { assignee: "agent" },
      subtasks: [
        {
          dependencies: [],
          description: `Clarify the expected behavior for ${task.title}.`,
          key: `${task.key}-scope`,
          metadata: { type: "planning" },
          title: "Clarify scope",
        },
        {
          dependencies: [`${task.key}-scope`],
          description: `Implement the work needed for ${task.title}.`,
          key: `${task.key}-implement`,
          metadata: { type: "implementation" },
          title: "Implement changes",
        },
        {
          dependencies: [`${task.key}-implement`],
          description: `Verify ${task.title} works as expected.`,
          key: `${task.key}-verify`,
          metadata: { type: "verification" },
          title: "Verify behavior",
        },
      ],
      title: task.title,
    })),
  );
}

export async function generateProjectIdeaTaskTitles(
  viewerId: string,
  projectId: string,
  ideaId: string,
  db: Database = getDb(),
) {
  const idea = await getProjectIdeaById(viewerId, projectId, ideaId, db);

  if (!idea) {
    return { error: "not_found" as const, tasks: [] };
  }

  try {
    const result = await generateText({
      model: IDEA_MODEL,
      output: Output.object({
        description: "A concise implementation task title list for an Idea.",
        name: "ideaTaskTitles",
        schema: generatedTaskTitlesSchema,
      }),
      prompt: [
        "Generate implementation task titles for this product idea.",
        "Return 3 to 8 tasks by default unless the idea clearly needs another count.",
        "Tasks should describe delivery work, not user stories.",
        "Use stable lower-kebab keys such as api-contract or workspace-ui.",
        summarizeIdeaForTaskGeneration(idea),
      ].join("\n\n"),
    });

    return {
      error: null as GeneratedIdeaTaskError,
      tasks: normalizeGeneratedTaskTitles(result.output.tasks),
    };
  } catch {
    return {
      error: null as GeneratedIdeaTaskError,
      tasks: buildFallbackTaskTitles(idea),
    };
  }
}

export async function refineProjectIdeaTaskTitles(
  viewerId: string,
  projectId: string,
  ideaId: string,
  titles: GeneratedIdeaTaskTitle[],
  direction: "more_abstract" | "more_detailed",
  db: Database = getDb(),
) {
  const idea = await getProjectIdeaById(viewerId, projectId, ideaId, db);

  if (!idea) {
    return { error: "not_found" as const, tasks: [] };
  }

  const currentTitles = normalizeGeneratedTaskTitles(titles);

  if (currentTitles.length === 0) {
    return { error: "invalid_payload" as const, tasks: [] };
  }

  try {
    const result = await generateText({
      model: IDEA_MODEL,
      output: Output.object({
        description: "A refined implementation task title list for an Idea.",
        name: "refinedIdeaTaskTitles",
        schema: generatedTaskTitlesSchema,
      }),
      prompt: [
        "Refine this implementation task list.",
        direction === "more_detailed"
          ? "Make the list more detailed by splitting broad tasks into smaller delivery tasks."
          : "Make the list more abstract by consolidating overlapping tasks into fewer delivery tasks.",
        "Preserve useful wording where possible, and return stable lower-kebab keys.",
        summarizeIdeaForTaskGeneration(idea),
        "Current task titles:",
        currentTitles.map((task, index) => `${index + 1}. ${task.key}: ${task.title}`).join("\n"),
      ].join("\n\n"),
    });

    return {
      error: null as GeneratedIdeaTaskError,
      tasks: normalizeGeneratedTaskTitles(result.output.tasks),
    };
  } catch {
    return {
      error: null as GeneratedIdeaTaskError,
      tasks: currentTitles,
    };
  }
}

export async function generateProjectIdeaTaskDetails(
  viewerId: string,
  projectId: string,
  ideaId: string,
  titles: GeneratedIdeaTaskTitle[],
  db: Database = getDb(),
) {
  const idea = await getProjectIdeaById(viewerId, projectId, ideaId, db);

  if (!idea) {
    return { error: "not_found" as const, tasks: [] };
  }

  const taskTitles = normalizeGeneratedTaskTitles(titles);

  if (taskTitles.length === 0) {
    return { error: "invalid_payload" as const, tasks: [] };
  }

  try {
    const result = await generateText({
      model: IDEA_MODEL,
      output: Output.object({
        description: "Detailed tasks and subtasks for an Idea implementation plan.",
        name: "ideaTaskDetails",
        schema: generatedTaskDetailsSchema,
      }),
      prompt: [
        "Generate task details and subtasks for these approved task titles.",
        "Keep the task keys exactly as provided.",
        "Each task needs 2 to 6 concrete subtasks.",
        "Generated subtasks must start incomplete; do not include completion fields.",
        "Dependencies may reference only keys in the same scope: task dependencies use task keys, subtask dependencies use sibling subtask keys.",
        "Metadata must be a JSON object and may include category, type, or assignee.",
        summarizeIdeaForTaskGeneration(idea),
        "Approved task titles:",
        taskTitles.map((task, index) => `${index + 1}. ${task.key}: ${task.title}`).join("\n"),
      ].join("\n\n"),
    });
    const tasks = normalizeGeneratedTaskDrafts(result.output.tasks);
    const validationError = validateGeneratedTaskDrafts(tasks);

    if (validationError) {
      return { error: validationError, tasks: [] };
    }

    return {
      error: null as GeneratedIdeaTaskError,
      tasks,
    };
  } catch {
    const tasks = buildFallbackTaskDetails(taskTitles);

    return {
      error: null as GeneratedIdeaTaskError,
      tasks,
    };
  }
}

export async function applyGeneratedProjectIdeaTasks(
  viewerId: string,
  projectId: string,
  ideaId: string,
  tasks: GeneratedIdeaTaskDraft[],
  mode: GeneratedIdeaTaskApplyMode,
  db: Database = getDb(),
) {
  const access = await getAccessibleIdeaBase(viewerId, projectId, ideaId, db);

  if (!access) {
    return { error: "not_found" as const, idea: null };
  }

  const generatedTasks = normalizeGeneratedTaskDrafts(tasks);

  if (generatedTasks.length === 0) {
    return { error: "invalid_payload" as const, idea: null };
  }

  const validationError = validateGeneratedTaskDrafts(generatedTasks);

  if (validationError) {
    return { error: validationError, idea: null };
  }

  const existingTasks = await listIdeaTasks(ideaId, db);
  const taskIdsToDelete =
    mode === "replace_all"
      ? existingTasks.map((task) => task.id)
      : mode === "replace_empty"
        ? existingTasks.filter((task) => task.subtasks.length === 0).map((task) => task.id)
        : [];

  await db.transaction(async (tx) => {
    await lockPositionScope(tx, ideaId);

    if (taskIdsToDelete.length > 0) {
      await tx.delete(ideaTasks).where(inArray(ideaTasks.id, taskIdsToDelete));
    }

    const startPosition =
      mode === "replace_all"
        ? 0
        : await tx
            .select({
              position: ideaTasks.position,
            })
            .from(ideaTasks)
            .where(eq(ideaTasks.ideaId, ideaId))
            .orderBy(desc(ideaTasks.position))
            .then((rows) => (rows[0]?.position ?? -1) + 1);
    const taskIdByKey = new Map<string, string>();
    const subtaskIdByTaskKey = new Map<string, Map<string, string>>();
    const taskRows = generatedTasks.map((task, index) => {
      const id = randomUUID();
      taskIdByKey.set(task.key, id);

      return {
        description: task.description,
        id,
        ideaId,
        metadata: task.metadata,
        position: startPosition + index,
        title: task.title,
      } satisfies typeof ideaTasks.$inferInsert;
    });

    await tx.insert(ideaTasks).values(taskRows);

    const subtaskRows: (typeof ideaSubtasks.$inferInsert)[] = [];

    for (const task of generatedTasks) {
      const taskId = taskIdByKey.get(task.key);

      if (!taskId) {
        continue;
      }

      const subtaskIdByKey = new Map<string, string>();
      subtaskIdByTaskKey.set(task.key, subtaskIdByKey);

      task.subtasks.forEach((subtask, index) => {
        const id = randomUUID();
        subtaskIdByKey.set(subtask.key, id);
        subtaskRows.push({
          completedAt: null,
          description: subtask.description,
          id,
          metadata: subtask.metadata,
          position: index,
          taskId,
          title: subtask.title,
        });
      });
    }

    if (subtaskRows.length > 0) {
      await tx.insert(ideaSubtasks).values(subtaskRows);
    }

    const taskDependencyRows = generatedTasks.flatMap((task) => {
      const taskId = taskIdByKey.get(task.key);

      if (!taskId) {
        return [];
      }

      return task.dependencies.map((dependencyKey) => ({
        dependsOnTaskId: taskIdByKey.get(dependencyKey) ?? "",
        taskId,
      }));
    });

    if (taskDependencyRows.length > 0) {
      await tx.insert(ideaTaskDependencies).values(taskDependencyRows);
    }

    const subtaskDependencyRows = generatedTasks.flatMap((task) => {
      const subtaskIdByKey = subtaskIdByTaskKey.get(task.key);

      if (!subtaskIdByKey) {
        return [];
      }

      return task.subtasks.flatMap((subtask) => {
        const subtaskId = subtaskIdByKey.get(subtask.key);

        if (!subtaskId) {
          return [];
        }

        return subtask.dependencies.map((dependencyKey) => ({
          dependsOnSubtaskId: subtaskIdByKey.get(dependencyKey) ?? "",
          subtaskId,
        }));
      });
    });

    if (subtaskDependencyRows.length > 0) {
      await tx.insert(ideaSubtaskDependencies).values(subtaskDependencyRows);
    }
  });

  return {
    error: null as GeneratedIdeaTaskError,
    idea: await getIdeaById(projectId, ideaId, db),
  };
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
