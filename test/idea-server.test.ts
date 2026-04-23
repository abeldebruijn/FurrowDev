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
  listProjectIdeas,
  regenerateIdeaDocuments,
  updateIdeaDocuments,
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

  it("creates idea with generated spec sheet and user stories", async () => {
    const insertedValues: unknown[] = [];
    const updatedValues: unknown[] = [];
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
      specSheet: "# Spec",
      title: "Shared idea",
      updatedAt: new Date("2026-04-15T10:00:00.000Z"),
      userStories: "- As a user",
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
        userStories: "- As a user",
      },
    });
    getProjectAccess.mockResolvedValue({
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
    expect(insertedValues[0]).toEqual(
      expect.objectContaining({
        context: "## Current understanding",
        createdByUserId: "viewer-1",
        projectId: "project-1",
        sourceVisionId: "vision-1",
        specSheet: "# Spec",
        title: "Shared idea",
        userStories: "- As a user",
      }),
    );
    expect(updatedValues[0]).toEqual(
      expect.objectContaining({
        archivedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("returns an existing idea for duplicate conversion", async () => {
    const existingIdea = {
      id: "idea-1",
      sourceVisionId: "vision-1",
    };
    const db = {
      select: vi.fn(() => createSelectBuilder([existingIdea])),
      transaction: vi.fn(),
    };
    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: false,
      isOwner: true,
    });

    await expect(
      convertVisionToIdea("viewer-1", "project-1", "vision-1", {}, db as any),
    ).resolves.toEqual({
      error: null,
      idea: existingIdea,
    });
    expect(generateText).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rejects conversion from project viewers who are not owners, maintainers, or admins", async () => {
    const db = {
      select: vi.fn(),
      transaction: vi.fn(),
    };
    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: false,
      isOwner: false,
      roadmapId: "roadmap-1",
    });

    await expect(
      convertVisionToIdea("viewer-1", "project-1", "vision-1", {}, db as any),
    ).resolves.toEqual({
      error: "forbidden",
      idea: null,
    });
    expect(getAccessibleVision).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("updates manual spec sheet and user stories", async () => {
    const existingIdea = {
      context: "## ctx",
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
      userStories: "- Old",
    };
    const updatedIdea = {
      ...existingIdea,
      specSheet: "# New",
      userStories: "- New",
    };
    const selectQueue = [createSelectBuilder([existingIdea]), createSelectBuilder([updatedIdea])];
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

    getProjectAccess.mockResolvedValue({
      id: "project-1",
      isAdmin: false,
      isMaintainer: false,
      isOwner: false,
      roadmapId: "roadmap-1",
    });

    await expect(
      updateIdeaDocuments(
        "viewer-1",
        "project-1",
        "idea-1",
        { specSheet: "# New", userStories: "- New" },
        db as any,
      ),
    ).resolves.toEqual({
      error: null,
      idea: updatedIdea,
    });
    expect(setValues[0]).toEqual(
      expect.objectContaining({
        specSheet: "# New",
        userStories: "- New",
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
      userStories: "- Old",
    };
    const updatedIdea = {
      ...existingIdea,
      specSheet: "# Regenerated",
      userStories: "- Regenerated",
    };
    const selectQueue = [createSelectBuilder([existingIdea]), createSelectBuilder([updatedIdea])];
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
        userStories: "- Regenerated",
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
        userStories: "- Regenerated",
      }),
    );
    expect((setValues[0] as { context?: string }).context).toBeUndefined();
    expect(updatedIdea.context).toBe("## Keep context");
  });
});
