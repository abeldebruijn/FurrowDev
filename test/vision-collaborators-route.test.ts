import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  addVisionCollaborator,
  getWorkOSSession,
  removeVisionCollaborator,
  upsertViewerFromWorkOSSession,
} = vi.hoisted(() => ({
  addVisionCollaborator: vi.fn(),
  getWorkOSSession: vi.fn(),
  removeVisionCollaborator: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/vision/server", () => ({
  addVisionCollaborator,
  removeVisionCollaborator,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import {
  DELETE,
  POST,
} from "../app/api/project/[project-id]/ideas/[vision-id]/collaborators/route";

describe("vision collaborators route", () => {
  beforeEach(() => {
    addVisionCollaborator.mockReset();
    getWorkOSSession.mockReset();
    removeVisionCollaborator.mockReset();
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

  it("adds a collaborator", async () => {
    addVisionCollaborator.mockResolvedValue({ error: null });

    const response = await POST(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/collaborators", {
        body: JSON.stringify({
          userId: "550e8400-e29b-41d4-a716-446655440000",
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

    expect(addVisionCollaborator).toHaveBeenCalledWith(
      "viewer-1",
      "project-1",
      "vision-1",
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(response.status).toBe(200);
  });

  it("returns the add-specific owner error", async () => {
    addVisionCollaborator.mockResolvedValue({ error: "owner" });

    const response = await POST(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/collaborators", {
        body: JSON.stringify({
          userId: "550e8400-e29b-41d4-a716-446655440000",
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

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "The vision owner is already a collaborator.",
    });
  });

  it("rejects removing the owner", async () => {
    removeVisionCollaborator.mockResolvedValue({ error: "owner" });

    const response = await DELETE(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/collaborators", {
        body: JSON.stringify({
          userId: "550e8400-e29b-41d4-a716-446655440000",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "DELETE",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
          "vision-id": "vision-1",
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "The vision owner cannot be removed.",
    });
  });
});
