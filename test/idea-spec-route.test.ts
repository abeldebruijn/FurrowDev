import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  getWorkOSSession,
  regenerateIdeaDocuments,
  updateIdeaDocuments,
  upsertViewerFromWorkOSSession,
} = vi.hoisted(() => ({
  getWorkOSSession: vi.fn(),
  regenerateIdeaDocuments: vi.fn(),
  updateIdeaDocuments: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/idea/server", () => ({
  regenerateIdeaDocuments,
  updateIdeaDocuments,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { PATCH, POST } from "../app/api/project/[project-id]/ideas/idea/[idea-id]/spec/route";

describe("idea spec route", () => {
  beforeEach(() => {
    getWorkOSSession.mockReset();
    regenerateIdeaDocuments.mockReset();
    updateIdeaDocuments.mockReset();
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

    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1/spec") as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("updates manual spec and stories", async () => {
    updateIdeaDocuments.mockResolvedValue({
      error: null,
      idea: {
        id: "idea-1",
      },
    });

    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1/spec", {
        body: JSON.stringify({
          specSheet: "# Spec",
          userStories: [
            {
              id: "story-1",
              outcome: "so that checkout is faster",
              story: "As a buyer, I want fewer checkout steps",
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

    expect(updateIdeaDocuments).toHaveBeenCalledWith("viewer-1", "project-1", "idea-1", {
      specSheet: "# Spec",
      userStories: [
        {
          id: "story-1",
          outcome: "so that checkout is faster",
          story: "As a buyer, I want fewer checkout steps",
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("regenerates spec document", async () => {
    regenerateIdeaDocuments.mockResolvedValue({
      error: null,
      idea: {
        id: "idea-1",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1/spec", {
        body: JSON.stringify({
          specSheet: true,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(regenerateIdeaDocuments).toHaveBeenCalledWith("viewer-1", "project-1", "idea-1", {
      specSheet: true,
      userStories: undefined,
    });
    expect(response.status).toBe(200);
  });

  it("returns not found for missing ideas", async () => {
    updateIdeaDocuments.mockResolvedValue({
      error: "not_found",
      idea: null,
    });

    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1/spec", {
        body: JSON.stringify({
          specSheet: "# Spec",
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

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Idea not found." });
  });
});
