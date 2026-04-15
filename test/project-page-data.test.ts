import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  getDb,
  getProjectAccess,
  getProjectRoadmap,
  getProjectRoadmapItems,
  getWorkOSSession,
  upsertViewerFromWorkOSSession,
  withAuth,
} = vi.hoisted(() => ({
  getDb: vi.fn(),
  getProjectAccess: vi.fn(),
  getProjectRoadmap: vi.fn(),
  getProjectRoadmapItems: vi.fn(),
  getWorkOSSession: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
  withAuth: vi.fn(),
}));

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth,
}));

vi.mock("@/lib/db", () => ({
  getDb,
}));

vi.mock("@/lib/project/server", () => ({
  getProjectAccess,
  getProjectRoadmap,
  getProjectRoadmapItems,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { getProjectPageData } from "../app/project/[project-id]/project-page-data";

describe("getProjectPageData", () => {
  beforeEach(() => {
    getDb.mockReset();
    getProjectAccess.mockReset();
    getProjectRoadmap.mockReset();
    getProjectRoadmapItems.mockReset();
    getWorkOSSession.mockReset();
    upsertViewerFromWorkOSSession.mockReset();
    withAuth.mockReset();

    withAuth.mockResolvedValue({
      user: {
        id: "workos-user-1",
      },
    });
    getWorkOSSession.mockResolvedValue({
      user: {
        id: "workos-user-1",
      },
    });
    upsertViewerFromWorkOSSession.mockResolvedValue({
      id: "viewer-1",
    });
    getDb.mockReturnValue("db");
    getProjectAccess.mockResolvedValue({
      canViewModeration: false,
      canViewSettings: true,
      conceptProjectId: null,
      conceptProjectName: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      description: "project description",
      id: "project-1",
      isAdmin: false,
      isOrganisationProject: false,
      isOwner: true,
      layout: null,
      name: "Dragon Dash",
      orgOwner: null,
      roadmapId: "roadmap-1",
      ubiquitousLanguageMarkdown: null,
      userOwner: "viewer-1",
    });
    getProjectRoadmap.mockResolvedValue({
      currentMajor: 1,
      currentMinor: 2,
      id: "roadmap-1",
    });
    getProjectRoadmapItems.mockResolvedValue([
      {
        description: "Ship beta",
        id: "item-1",
        majorVersion: 1,
        minorVersion: 2,
        name: "Beta launch",
      },
    ]);
  });

  it("returns the project plus roadmap data for widget rendering", async () => {
    const result = await getProjectPageData("project-1");

    expect(getProjectAccess).toHaveBeenCalledWith("viewer-1", "project-1", "db");
    expect(getProjectRoadmap).toHaveBeenCalledWith("roadmap-1", "db");
    expect(getProjectRoadmapItems).toHaveBeenCalledWith("roadmap-1", "db");
    expect(result).toMatchObject({
      project: {
        id: "project-1",
        name: "Dragon Dash",
      },
      projectRoadmap: {
        currentMajor: 1,
        currentMinor: 2,
        id: "roadmap-1",
      },
      projectRoadmapItems: [
        {
          id: "item-1",
          name: "Beta launch",
        },
      ],
      widgetLayout: null,
    });
  });
});
