import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  archiveAccessibleVision,
  deleteAccessibleVision,
  getWorkOSSession,
  updateAccessibleVision,
  upsertViewerFromWorkOSSession,
} = vi.hoisted(() => ({
  archiveAccessibleVision: vi.fn(),
  deleteAccessibleVision: vi.fn(),
  getWorkOSSession: vi.fn(),
  updateAccessibleVision: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/vision/server", () => ({
  archiveAccessibleVision,
  deleteAccessibleVision,
  updateAccessibleVision,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { DELETE, PATCH } from "../app/api/project/[project-id]/ideas/[vision-id]/settings/route";

describe("vision settings route", () => {
  beforeEach(() => {
    archiveAccessibleVision.mockReset();
    deleteAccessibleVision.mockReset();
    getWorkOSSession.mockReset();
    updateAccessibleVision.mockReset();
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

  it("renames a vision", async () => {
    updateAccessibleVision.mockResolvedValue({ error: null });

    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/settings", {
        body: JSON.stringify({
          title: "Sharper checkout vision",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
          "vision-id": "vision-1",
        }),
      },
    );

    expect(updateAccessibleVision).toHaveBeenCalledWith("viewer-1", "project-1", "vision-1", {
      title: "Sharper checkout vision",
    });
    expect(response.status).toBe(200);
  });

  it("archives a vision", async () => {
    archiveAccessibleVision.mockResolvedValue({ error: null });

    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/settings", {
        body: JSON.stringify({
          archive: true,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
          "vision-id": "vision-1",
        }),
      },
    );

    expect(archiveAccessibleVision).toHaveBeenCalledWith("viewer-1", "project-1", "vision-1");
    expect(response.status).toBe(200);
  });

  it("deletes a vision", async () => {
    deleteAccessibleVision.mockResolvedValue({ error: null });

    const response = await DELETE(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/settings", {
        method: "DELETE",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
          "vision-id": "vision-1",
        }),
      },
    );

    expect(deleteAccessibleVision).toHaveBeenCalledWith("viewer-1", "project-1", "vision-1");
    expect(response.status).toBe(200);
  });

  it("returns the owner-only settings error", async () => {
    updateAccessibleVision.mockResolvedValue({ error: "forbidden" });

    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/settings", {
        body: JSON.stringify({
          title: "Sharper checkout vision",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
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
      error: "Only the vision owner can change vision settings.",
    });
  });
});
