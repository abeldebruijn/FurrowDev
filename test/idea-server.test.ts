import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { generateText, getAccessibleVision, getDb, getProjectAccess, getProjectRoadmapItems } =
  vi.hoisted(() => ({
    generateText: vi.fn(),
    getAccessibleVision: vi.fn(),
    getDb: vi.fn(),
    getProjectAccess: vi.fn(),
    getProjectRoadmapItems: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  getDb,
}));

vi.mock("ai", () => ({
  Output: {
    object: (value: unknown) => value,
  },
  generateText,
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  asc: (arg: unknown) => arg,
  desc: (arg: unknown) => arg,
  eq: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

vi.mock("@/drizzle/schema", () => ({
  ideaSubtaskDependencies: {
    dependsOnSubtaskId: "ideaSubtaskDependencies.dependsOnSubtaskId",
    subtaskId: "ideaSubtaskDependencies.subtaskId",
  },
  ideaSubtasks: {
    completedAt: "ideaSubtasks.completedAt",
    createdAt: "ideaSubtasks.createdAt",
    description: "ideaSubtasks.description",
    id: "ideaSubtasks.id",
    metadata: "ideaSubtasks.metadata",
    position: "ideaSubtasks.position",
    taskId: "ideaSubtasks.taskId",
    title: "ideaSubtasks.title",
    updatedAt: "ideaSubtasks.updatedAt",
  },
  ideaTaskDependencies: {
    dependsOnTaskId: "ideaTaskDependencies.dependsOnTaskId",
    taskId: "ideaTaskDependencies.taskId",
  },
  ideaTasks: {
    createdAt: "ideaTasks.createdAt",
    description: "ideaTasks.description",
    id: "ideaTasks.id",
    ideaId: "ideaTasks.ideaId",
    metadata: "ideaTasks.metadata",
    position: "ideaTasks.position",
    title: "ideaTasks.title",
    updatedAt: "ideaTasks.updatedAt",
  },
  ideas: {
    context: "ideas.context",
    createdAt: "ideas.createdAt",
    createdByUserId: "ideas.createdByUserId",
    id: "ideas.id",
    projectId: "ideas.projectId",
    roadmapItemId: "ideas.roadmapItemId",
    sourceVisionId: "ideas.sourceVisionId",
    specSheet: "ideas.specSheet",
    title: "ideas.title",
    updatedAt: "ideas.updatedAt",
    userStories: "ideas.userStories",
  },
  roadmapItems: {
    id: "roadmapItems.id",
    majorVersion: "roadmapItems.majorVersion",
    minorVersion: "roadmapItems.minorVersion",
    name: "roadmapItems.name",
  },
  users: {
    id: "users.id",
    name: "users.name",
  },
  visions: {
    archivedAt: "visions.archivedAt",
    id: "visions.id",
    title: "visions.title",
    updatedAt: "visions.updatedAt",
  },
  visionSummaryDocuments: {
    content: "visionSummaryDocuments.content",
    visionId: "visionSummaryDocuments.visionId",
  },
}));

vi.mock("@/lib/project/server", () => ({
  getProjectAccess,
  getProjectRoadmapItems,
}));

vi.mock("@/lib/vision/server", () => ({
  getAccessibleVision,
}));

import {
  convertVisionToIdea,
  createProjectIdeaTask,
  getProjectIdeaById,
  listProjectIdeas,
  regenerateIdeaDocuments,
  updateProjectIdeaWorkspace,
} from "../lib/idea/server";

function createSelectBuilder(rows: unknown[]) {
  const builder = {
    from: vi.fn(() => builder),
    innerJoin: vi.fn(() => builder),
    leftJoin: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(rows)),
    orderBy: vi.fn(() => Promise.resolve(rows)),
    where: vi.fn(() => builder),
  };

  return builder;
}

describe("idea server helpers", () => {
  beforeEach(() => {
    generateText.mockReset();
    getAccessibleVision.mockReset();
    getDb.mockReset();
    getProjectAccess.mockReset();
    getProjectRoadmapItems.mockReset();
  });

  it("enforces project access when listing ideas", async () => {
    const db = {
      select: vi.fn(),
    };
    getProjectAccess.mockResolvedValue(null);

    await expect(listProjectIdeas("viewer-1", "project-1", db as any)).resolves.toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns null when idea detail is inaccessible", async () => {
    const db = {
      select: vi.fn(),
    };
    getProjectAccess.mockResolvedValue(null);

    await expect(
      getProjectIdeaById("viewer-1", "project-1", "idea-1", db as any),
    ).resolves.toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns idea detail with task and subtask completion rollups", async () => {
    const ideaRow = {
      context: "Context",
      createdAt: new Date("2026-04-15T10:00:00.000Z"),
      createdByName: "Riley",
      createdByUserId: "viewer-1",
      id: "idea-1",
      projectId: "project-1",
      roadmapItemId: null,
      roadmapItemMajorVersion: null,
      roadmapItemMinorVersion: null,
      roadmapItemName: null,
      sourceVisionId: "vision-1",
      sourceVisionTitle: "Checkout rethink",
      specSheet: "Spec",
      title: "Shared idea",
      updatedAt: new Date("2026-04-15T10:00:00.000Z"),
      userStories: [],
    };
    const taskRows = [
      {
        createdAt: new Date("2026-04-15T10:00:00.000Z"),
        description: "",
        id: "task-1",
        ideaId: "idea-1",
        metadata: { category: "backend" },
        position: 0,
        title: "Build API",
        updatedAt: new Date("2026-04-15T10:00:00.000Z"),
      },
    ];
    const subtaskRows = [
      {
        completedAt: new Date("2026-04-16T10:00:00.000Z"),
        createdAt: new Date("2026-04-15T10:00:00.000Z"),
        description: "",
        id: "subtask-1",
        metadata: { assignee: "agent" },
        position: 0,
        taskId: "task-1",
        title: "Create route",
        updatedAt: new Date("2026-04-16T10:00:00.000Z"),
      },
    ];
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectBuilder([ideaRow]))
        .mockReturnValueOnce(createSelectBuilder(taskRows))
        .mockReturnValueOnce(createSelectBuilder(subtaskRows))
        .mockReturnValueOnce(createSelectBuilder([]))
        .mockReturnValueOnce(createSelectBuilder([])),
    };
    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: true,
      isOwner: false,
      roadmapId: "roadmap-1",
    });

    await expect(getProjectIdeaById("viewer-1", "project-1", "idea-1", db as any)).resolves.toEqual(
      expect.objectContaining({
        isDone: true,
        tasks: [
          expect.objectContaining({
            isDone: true,
            metadata: { category: "backend" },
            subtasks: [
              expect.objectContaining({
                isDone: true,
                metadata: { assignee: "agent" },
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("treats empty idea and task rollups as not done", async () => {
    const ideaRow = {
      context: "Context",
      createdAt: new Date("2026-04-15T10:00:00.000Z"),
      createdByName: "Riley",
      createdByUserId: "viewer-1",
      id: "idea-1",
      projectId: "project-1",
      roadmapItemId: null,
      roadmapItemMajorVersion: null,
      roadmapItemMinorVersion: null,
      roadmapItemName: null,
      sourceVisionId: "vision-1",
      sourceVisionTitle: "Checkout rethink",
      specSheet: "Spec",
      title: "Shared idea",
      updatedAt: new Date("2026-04-15T10:00:00.000Z"),
      userStories: [],
    };
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectBuilder([ideaRow]))
        .mockReturnValueOnce(
          createSelectBuilder([
            {
              createdAt: new Date("2026-04-15T10:00:00.000Z"),
              description: "",
              id: "task-1",
              ideaId: "idea-1",
              metadata: {},
              position: 0,
              title: "Build API",
              updatedAt: new Date("2026-04-15T10:00:00.000Z"),
            },
          ]),
        )
        .mockReturnValueOnce(createSelectBuilder([]))
        .mockReturnValueOnce(createSelectBuilder([])),
    };
    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: true,
      isOwner: false,
      roadmapId: "roadmap-1",
    });

    await expect(getProjectIdeaById("viewer-1", "project-1", "idea-1", db as any)).resolves.toEqual(
      expect.objectContaining({
        isDone: false,
        tasks: [expect.objectContaining({ isDone: false, subtasks: [] })],
      }),
    );
  });

  it("updates editable idea workspace fields", async () => {
    const ideaBefore = {
      context: "Context",
      createdAt: new Date("2026-04-15T10:00:00.000Z"),
      createdByName: "Riley",
      createdByUserId: "viewer-1",
      id: "idea-1",
      projectId: "project-1",
      roadmapItemId: null,
      roadmapItemMajorVersion: null,
      roadmapItemMinorVersion: null,
      roadmapItemName: null,
      sourceVisionId: "vision-1",
      sourceVisionTitle: "Checkout rethink",
      specSheet: "Spec",
      title: "Shared idea",
      updatedAt: new Date("2026-04-15T10:00:00.000Z"),
      userStories: [],
    };
    const ideaAfter = {
      ...ideaBefore,
      context: "Updated context",
      specSheet: "Updated spec",
      updatedAt: new Date("2026-04-16T10:00:00.000Z"),
      userStories: [
        {
          id: "story-1",
          outcome: "So checkout is quicker",
          story: "As a buyer I want fewer clicks",
        },
      ],
    };
    const selectQueue = [
      createSelectBuilder([ideaBefore]),
      createSelectBuilder([ideaAfter]),
      createSelectBuilder([]),
    ];
    const setValues: unknown[] = [];
    const db = {
      select: vi.fn(() => selectQueue.shift()),
      update: vi.fn(() => ({
        set: vi.fn((values) => {
          setValues.push(values);

          return {
            where: vi.fn(() => Promise.resolve()),
          };
        }),
      })),
    };

    getProjectAccess.mockResolvedValue({
      canConvertVisionToIdea: true,
      id: "project-1",
      isAdmin: false,
      isMaintainer: true,
      isOwner: false,
      roadmapId: "roadmap-1",
    });

    await expect(
      updateProjectIdeaWorkspace(
        "viewer-1",
        "project-1",
        "idea-1",
        {
          context: "Updated context",
          specSheet: "Updated spec",
          userStories: [
            {
              id: "story-1",
              outcome: "So checkout is quicker",
              story: "As a buyer I want fewer clicks",
            },
          ],
        },
        db as any,
      ),
    ).resolves.toEqual({
      error: null,
      idea: expect.objectContaining({
        ...ideaAfter,
        isDone: false,
        tasks: [],
      }),
    });
    expect(setValues[0]).toEqual(
      expect.objectContaining({
        context: "Updated context",
        specSheet: "Updated spec",
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("persists a task with metadata and dependencies", async () => {
    const insertedRows: unknown[] = [];
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectBuilder([{ id: "idea-1" }]))
        .mockReturnValueOnce(createSelectBuilder([{ id: "dependency-task" }]))
        .mockReturnValueOnce(createSelectBuilder([{ id: "idea-1" }]))
        .mockReturnValueOnce(createSelectBuilder([])),
      transaction: vi.fn(async (callback) =>
        callback({
          execute: vi.fn(() => Promise.resolve()),
          insert: vi.fn(() => ({
            values: vi.fn((values) => {
              insertedRows.push(values);

              return Promise.resolve();
            }),
          })),
          select: vi.fn(() => createSelectBuilder([{ position: 4 }])),
        }),
      ),
    };
    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: true,
      isOwner: false,
      roadmapId: "roadmap-1",
    });

    await createProjectIdeaTask(
      "viewer-1",
      "project-1",
      "idea-1",
      {
        dependencies: ["dependency-task"],
        metadata: { assignee: "agent", category: "backend" },
        title: " Build API ",
      },
      db as any,
    );

    expect(insertedRows[0]).toEqual(
      expect.objectContaining({
        metadata: { assignee: "agent", category: "backend" },
        position: 5,
        title: "Build API",
      }),
    );
    expect(insertedRows[1]).toEqual([
      expect.objectContaining({
        dependsOnTaskId: "dependency-task",
      }),
    ]);
  });

  it("rejects invalid roadmap links while updating an idea", async () => {
    const ideaRow = {
      id: "idea-1",
    };
    const db = {
      select: vi.fn(() => createSelectBuilder([ideaRow])),
      update: vi.fn(),
    };
    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: true,
      isOwner: false,
      roadmapId: "roadmap-1",
    });
    getProjectRoadmapItems.mockResolvedValue([]);

    await expect(
      updateProjectIdeaWorkspace(
        "viewer-1",
        "project-1",
        "idea-1",
        {
          roadmapItemId: "550e8400-e29b-41d4-a716-446655440000",
        },
        db as any,
      ),
    ).resolves.toEqual({
      error: "invalid_roadmap_item",
      idea: null,
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects invalid user stories while updating an idea", async () => {
    const ideaRow = {
      id: "idea-1",
    };
    const db = {
      select: vi.fn(() => createSelectBuilder([ideaRow])),
      update: vi.fn(),
    };
    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: true,
      isOwner: false,
      roadmapId: "roadmap-1",
    });

    await expect(
      updateProjectIdeaWorkspace(
        "viewer-1",
        "project-1",
        "idea-1",
        {
          userStories: [
            {
              id: "story-1",
              outcome: "Outcome",
              story: "   ",
            },
          ],
        },
        db as any,
      ),
    ).resolves.toEqual({
      error: "invalid_user_stories",
      idea: null,
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects oversized user stories payloads", async () => {
    const ideaRow = {
      id: "idea-1",
    };
    const db = {
      select: vi.fn(() => createSelectBuilder([ideaRow])),
      update: vi.fn(),
    };
    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: true,
      isOwner: false,
      roadmapId: "roadmap-1",
    });

    await expect(
      updateProjectIdeaWorkspace(
        "viewer-1",
        "project-1",
        "idea-1",
        {
          userStories: Array.from({ length: 51 }, (_, index) => ({
            id: `story-${index}`,
            outcome: "Outcome",
            story: "As a user, I want a stable flow",
          })),
        },
        db as any,
      ),
    ).resolves.toEqual({
      error: "invalid_user_stories",
      idea: null,
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("creates idea with generated spec sheet and user stories", async () => {
    const insertedValues: unknown[] = [];
    const updatedValues: unknown[] = [];
    const generatedStories = [
      {
        id: "story-1",
        outcome: "so that checkout is faster",
        story: "As a buyer, I want fewer checkout steps",
      },
      {
        id: "story-2",
        outcome: "so that I can monitor impact",
        story: "As a PM, I want clear metrics",
      },
      {
        id: "story-3",
        outcome: "so that support load drops",
        story: "As support, I want fewer failed payments",
      },
      {
        id: "story-4",
        outcome: "so that release risk is lower",
        story: "As engineering, I want scoped rollout",
      },
    ];
    const ideaRow = {
      context: "## Current understanding",
      createdAt: new Date("2026-04-15T10:00:00.000Z"),
      createdByName: "Riley",
      createdByUserId: "viewer-1",
      id: "idea-1",
      projectId: "project-1",
      roadmapItemId: null,
      roadmapItemMajorVersion: null,
      roadmapItemMinorVersion: null,
      roadmapItemName: null,
      sourceVisionId: "vision-1",
      sourceVisionTitle: "Checkout rethink",
      title: "Shared idea",
      updatedAt: new Date("2026-04-15T10:00:00.000Z"),
    };
    const selectQueue = [
      createSelectBuilder([]),
      createSelectBuilder([{ content: "## Current understanding" }]),
      createSelectBuilder([ideaRow]),
    ];
    const tx = {
      insert: vi.fn(() => ({
        values: vi.fn((values) => {
          insertedValues.push(values);

          return {
            onConflictDoNothing: vi.fn(() => Promise.resolve()),
          };
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn((values) => {
          updatedValues.push(values);

          return {
            where: vi.fn(() => Promise.resolve()),
          };
        }),
      })),
    };
    const db = {
      select: vi.fn(() => selectQueue.shift()),
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    generateText.mockResolvedValue({
      output: {
        specSheet: "# Spec",
        userStories: generatedStories.map(({ id: _id, ...story }) => story),
      },
    });
    getProjectAccess.mockResolvedValue({
      canConvertVisionToIdea: true,
      id: "project-1",
      isAdmin: false,
      isMaintainer: true,
      isOwner: false,
      roadmapId: "roadmap-1",
    });
    getAccessibleVision.mockResolvedValue({
      id: "vision-1",
      summary: "## Current understanding",
      title: "Checkout rethink",
    });
    getProjectRoadmapItems.mockResolvedValue([]);

    await expect(
      convertVisionToIdea("viewer-1", "project-1", "vision-1", { title: "Shared idea" }, db as any),
    ).resolves.toEqual({
      error: null,
      idea: ideaRow,
    });

    const inserted = insertedValues[0] as { specSheet: string; userStories: Array<{ id: string }> };
    expect(inserted).toEqual(
      expect.objectContaining({
        context: "## Current understanding",
        createdByUserId: "viewer-1",
        projectId: "project-1",
        sourceVisionId: "vision-1",
        specSheet: "# Spec",
        title: "Shared idea",
      }),
    );
    expect(inserted.userStories).toHaveLength(4);
    expect(inserted.userStories.every((story) => story.id.length > 0)).toBe(true);
    expect(updatedValues[0]).toEqual(
      expect.objectContaining({
        archivedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("regenerates documents without changing idea context", async () => {
    const existingIdea = {
      context: "## Keep context",
      createdAt: new Date("2026-04-15T10:00:00.000Z"),
      createdByName: "Riley",
      createdByUserId: "viewer-1",
      id: "idea-1",
      projectId: "project-1",
      roadmapItemId: null,
      roadmapItemMajorVersion: null,
      roadmapItemMinorVersion: null,
      roadmapItemName: null,
      sourceVisionId: "vision-1",
      sourceVisionTitle: "Checkout rethink",
      specSheet: "# Old",
      title: "Shared idea",
      updatedAt: new Date("2026-04-15T10:00:00.000Z"),
      userStories: [],
    };
    const updatedIdea = {
      ...existingIdea,
      specSheet: "# Regenerated",
      userStories: [
        {
          id: "story-1",
          outcome: "Outcome",
          story: "As a user",
        },
      ],
    };
    const selectQueue = [
      createSelectBuilder([existingIdea]),
      createSelectBuilder([]),
      createSelectBuilder([existingIdea]),
      createSelectBuilder([updatedIdea]),
      createSelectBuilder([]),
    ];
    const setValues: unknown[] = [];
    const db = {
      select: vi.fn(() => selectQueue.shift()),
      update: vi.fn(() => ({
        set: vi.fn((value) => {
          setValues.push(value);

          return {
            where: vi.fn(() => Promise.resolve()),
          };
        }),
      })),
    };

    generateText.mockResolvedValue({
      output: {
        specSheet: "# Regenerated",
        userStories: [
          {
            outcome: "Outcome",
            story: "As a user",
          },
          {
            outcome: "Outcome 2",
            story: "As a user 2",
          },
          {
            outcome: "Outcome 3",
            story: "As a user 3",
          },
          {
            outcome: "Outcome 4",
            story: "As a user 4",
          },
        ],
      },
    });
    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: false,
      isOwner: false,
      roadmapId: "roadmap-1",
    });

    await expect(
      regenerateIdeaDocuments(
        "viewer-1",
        "project-1",
        "idea-1",
        { specSheet: true, userStories: true },
        db as any,
      ),
    ).resolves.toEqual({
      error: null,
      idea: {
        ...updatedIdea,
        isDone: false,
        tasks: [],
      },
    });

    expect(setValues[0]).toEqual(
      expect.objectContaining({
        specSheet: "# Regenerated",
        updatedAt: expect.any(Date),
      }),
    );
    expect((setValues[0] as { context?: string }).context).toBeUndefined();
  });

  it("regenerates only requested document targets", async () => {
    const existingIdea = {
      context: "## Keep context",
      createdAt: new Date("2026-04-15T10:00:00.000Z"),
      createdByName: "Riley",
      createdByUserId: "viewer-1",
      id: "idea-1",
      projectId: "project-1",
      roadmapItemId: null,
      roadmapItemMajorVersion: null,
      roadmapItemMinorVersion: null,
      roadmapItemName: null,
      sourceVisionId: "vision-1",
      sourceVisionTitle: "Checkout rethink",
      specSheet: "# Old",
      title: "Shared idea",
      updatedAt: new Date("2026-04-15T10:00:00.000Z"),
      userStories: [
        {
          id: "story-1",
          outcome: "Outcome",
          story: "As a user",
        },
      ],
    };
    const updatedIdea = {
      ...existingIdea,
      specSheet: "# Regenerated only",
    };
    const selectQueue = [
      createSelectBuilder([existingIdea]),
      createSelectBuilder([]),
      createSelectBuilder([existingIdea]),
      createSelectBuilder([updatedIdea]),
      createSelectBuilder([]),
    ];
    const setValues: unknown[] = [];
    const db = {
      select: vi.fn(() => selectQueue.shift()),
      update: vi.fn(() => ({
        set: vi.fn((value) => {
          setValues.push(value);

          return {
            where: vi.fn(() => Promise.resolve()),
          };
        }),
      })),
    };

    generateText.mockResolvedValue({
      output: {
        specSheet: "# Regenerated only",
      },
    });
    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: false,
      isOwner: false,
      roadmapId: "roadmap-1",
    });

    await expect(
      regenerateIdeaDocuments("viewer-1", "project-1", "idea-1", { specSheet: true }, db as any),
    ).resolves.toEqual({
      error: null,
      idea: {
        ...updatedIdea,
        isDone: false,
        tasks: [],
      },
    });

    expect(generateText).toHaveBeenCalledTimes(1);
    expect(setValues[0]).toEqual(
      expect.objectContaining({
        specSheet: "# Regenerated only",
      }),
    );
    expect((setValues[0] as { userStories?: unknown }).userStories).toBeUndefined();
  });
});
