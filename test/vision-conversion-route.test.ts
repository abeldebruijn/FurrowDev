import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  convertVisionToIdea,
  getIdeaBySourceVision,
  getWorkOSSession,
  upsertViewerFromWorkOSSession,
} = vi.hoisted(() => ({
  convertVisionToIdea: vi.fn(),
  getIdeaBySourceVision: vi.fn(),
  getWorkOSSession: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/idea/server", () => ({
  convertVisionToIdea,
  getIdeaBySourceVision,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { POST } from "../app/api/project/[project-id]/visions/[vision-id]/convert/route";
import { GET } from "../app/api/project/[project-id]/visions/[vision-id]/conversion/route";

describe("vision conversion routes", () => {
  beforeEach(() => {
    convertVisionToIdea.mockReset();
    getIdeaBySourceVision.mockReset();
    getWorkOSSession.mockReset();
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

  it("rejects unauthenticated conversion requests", async () => {
    getWorkOSSession.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost/api/project/project-1/visions/vision-1/convert", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
          "vision-id": "vision-1",
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("converts a visible vision into an idea", async () => {
    convertVisionToIdea.mockResolvedValue({
      error: null,
      idea: {
        id: "idea-1",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/project/project-1/visions/vision-1/convert", {
        body: JSON.stringify({
          roadmapItemId: "550e8400-e29b-41d4-a716-446655440000",
          title: "Shared checkout idea",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
          "vision-id": "vision-1",
        }),
      },
    );

    expect(convertVisionToIdea).toHaveBeenCalledWith("viewer-1", "project-1", "vision-1", {
      roadmapItemId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Shared checkout idea",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "idea-1", ok: true });
  });

  it("returns 404 when the vision is inaccessible", async () => {
    convertVisionToIdea.mockResolvedValue({
      error: "not_found",
      idea: null,
    });

    const response = await POST(
      new Request("http://localhost/api/project/project-1/visions/vision-1/convert", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
          "vision-id": "vision-1",
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 when the viewer cannot convert ideas", async () => {
    convertVisionToIdea.mockResolvedValue({
      error: "forbidden",
      idea: null,
    });

    const response = await POST(
      new Request("http://localhost/api/project/project-1/visions/vision-1/convert", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
          "vision-id": "vision-1",
        }),
      },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only project owners, maintainers, and admins can create ideas.",
    });
  });

  it("returns 400 when the roadmap item is invalid", async () => {
    convertVisionToIdea.mockResolvedValue({
      error: "invalid_roadmap_item",
      idea: null,
    });

    const response = await POST(
      new Request("http://localhost/api/project/project-1/visions/vision-1/convert", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
          "vision-id": "vision-1",
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Roadmap item not found." });
  });

  it("returns conversion status for a source vision", async () => {
    getIdeaBySourceVision.mockResolvedValue({
      id: "idea-1",
    });

    const response = await GET(
      new Request("http://localhost/api/project/project-1/visions/vision-1/conversion") as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
          "vision-id": "vision-1",
        }),
      },
    );

    expect(getIdeaBySourceVision).toHaveBeenCalledWith("viewer-1", "project-1", "vision-1");
    await expect(response.json()).resolves.toEqual({
      converted: true,
      id: "idea-1",
      ok: true,
    });
  });
});
