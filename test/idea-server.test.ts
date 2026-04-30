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
  desc: (arg: unknown) => arg,
  eq: (...args: unknown[]) => args,
}));

vi.mock("@/drizzle/schema", () => ({
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
    const selectQueue = [createSelectBuilder([ideaBefore]), createSelectBuilder([ideaAfter])];
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
      idea: ideaAfter,
    });
    expect(setValues[0]).toEqual(
      expect.objectContaining({
        context: "Updated context",
        specSheet: "Updated spec",
        updatedAt: expect.any(Date),
      }),
    );
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
      createSelectBuilder([existingIdea]),
      createSelectBuilder([updatedIdea]),
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
      idea: updatedIdea,
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
      createSelectBuilder([existingIdea]),
      createSelectBuilder([updatedIdea]),
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
      idea: updatedIdea,
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
