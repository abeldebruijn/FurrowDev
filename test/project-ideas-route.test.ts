import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { createVision, getWorkOSSession, upsertViewerFromWorkOSSession } = vi.hoisted(() => ({
  createVision: vi.fn(),
  getWorkOSSession: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/vision/server", () => ({
  createVision,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { POST } from "../app/api/project/[project-id]/ideas/route";

describe("project ideas route", () => {
  beforeEach(() => {
    createVision.mockReset();
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

  it("rejects unauthenticated requests", async () => {
    getWorkOSSession.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost/api/project/project-1/ideas") as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("creates a blank vision", async () => {
    createVision.mockResolvedValue("vision-1");

    const response = await POST(
      new Request("http://localhost/api/project/project-1/ideas", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      },
    );

    expect(createVision).toHaveBeenCalledWith({
      projectId: "project-1",
      roadmapItemId: undefined,
      title: undefined,
      viewerId: "viewer-1",
    });
    expect(response.status).toBe(200);
  });

  it("passes through the selected roadmap seed", async () => {
    createVision.mockResolvedValue("vision-2");

    await POST(
      new Request("http://localhost/api/project/project-1/ideas", {
        body: JSON.stringify({
          roadmapItemId: "550e8400-e29b-41d4-a716-446655440000",
          title: "Polish onboarding",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      },
    );

    expect(createVision).toHaveBeenCalledWith({
      projectId: "project-1",
      roadmapItemId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Polish onboarding",
      viewerId: "viewer-1",
    });
  });

  it("returns a safe 400 for known create errors", async () => {
    createVision.mockRejectedValue(new Error("Roadmap item not found."));

    const response = await POST(
      new Request("http://localhost/api/project/project-1/ideas", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Roadmap item not found." });
  });

  it("returns a generic 500 for unexpected create errors", async () => {
    createVision.mockRejectedValue(new Error("database exploded"));

    const response = await POST(
      new Request("http://localhost/api/project/project-1/ideas", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to create vision." });
  });
});
