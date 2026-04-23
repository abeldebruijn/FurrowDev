import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  getProjectIdeaById,
  getWorkOSSession,
  updateProjectIdeaWorkspace,
  upsertViewerFromWorkOSSession,
} = vi.hoisted(() => ({
  getProjectIdeaById: vi.fn(),
  getWorkOSSession: vi.fn(),
  updateProjectIdeaWorkspace: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/idea/server", () => ({
  getProjectIdeaById,
  updateProjectIdeaWorkspace,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { GET, PATCH } from "../app/api/project/[project-id]/ideas/idea/[idea-id]/route";

describe("project idea route", () => {
  beforeEach(() => {
    getProjectIdeaById.mockReset();
    getWorkOSSession.mockReset();
    updateProjectIdeaWorkspace.mockReset();
    upsertViewerFromWorkOSSession.mockReset();

    getWorkOSSession.mockResolvedValue({
      user: {
        id: "workos-user-1",
      },
    });
    upsertViewerFromWorkOSSession.mockResolvedValue({
      id: "viewer-1",
    });
  });

  it("rejects unauthenticated requests", async () => {
    getWorkOSSession.mockResolvedValueOnce(null);

    const response = await GET(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1") as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("returns an idea detail response", async () => {
    getProjectIdeaById.mockResolvedValue({
      id: "idea-1",
      title: "Shared checkout idea",
    });

    const response = await GET(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1") as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(getProjectIdeaById).toHaveBeenCalledWith("viewer-1", "project-1", "idea-1");
    expect(response.status).toBe(200);
  });

  it("returns 404 when the idea is inaccessible", async () => {
    getProjectIdeaById.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1") as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("updates editable idea workspace fields", async () => {
    updateProjectIdeaWorkspace.mockResolvedValue({
      error: null,
      idea: {
        id: "idea-1",
      },
    });

    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1", {
        body: JSON.stringify({
          context: "Updated context",
          roadmapItemId: null,
          specSheet: "Updated spec",
          userStories: [
            {
              id: "story-1",
              outcome: "So checkout is faster",
              story: "As a buyer I want fewer clicks",
            },
          ],
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(updateProjectIdeaWorkspace).toHaveBeenCalledWith("viewer-1", "project-1", "idea-1", {
      context: "Updated context",
      roadmapItemId: null,
      specSheet: "Updated spec",
      userStories: [
        {
          id: "story-1",
          outcome: "So checkout is faster",
          story: "As a buyer I want fewer clicks",
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("returns 400 for invalid idea payloads", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1", {
        body: JSON.stringify({
          userStories: [
            {
              id: "story-1",
              outcome: "",
              story: "As a buyer",
            },
          ],
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(400);
    expect(updateProjectIdeaWorkspace).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid roadmap links", async () => {
    updateProjectIdeaWorkspace.mockResolvedValue({
      error: "invalid_roadmap_item",
      idea: null,
    });

    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1", {
        body: JSON.stringify({
          roadmapItemId: "550e8400-e29b-41d4-a716-446655440000",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Roadmap item not found." });
  });
});
