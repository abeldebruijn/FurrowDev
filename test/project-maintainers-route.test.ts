import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  addProjectMaintainer,
  getWorkOSSession,
  removeProjectMaintainer,
  upsertViewerFromWorkOSSession,
} = vi.hoisted(() => ({
  addProjectMaintainer: vi.fn(),
  getWorkOSSession: vi.fn(),
  removeProjectMaintainer: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/project/server", () => ({
  addProjectMaintainer,
  removeProjectMaintainer,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { DELETE, POST } from "../app/api/project/[project-id]/maintainers/route";

describe("project maintainers route", () => {
  beforeEach(() => {
    addProjectMaintainer.mockReset();
    getWorkOSSession.mockReset();
    removeProjectMaintainer.mockReset();
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

  it("adds a maintainer", async () => {
    addProjectMaintainer.mockResolvedValue({ error: null });

    const response = await POST(
      new Request("http://localhost/api/project/project-1/maintainers", {
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
        }),
      },
    );

    expect(addProjectMaintainer).toHaveBeenCalledWith(
      "viewer-1",
      "project-1",
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(response.status).toBe(200);
  });

  it("removes a maintainer", async () => {
    removeProjectMaintainer.mockResolvedValue({ error: null });

    const response = await DELETE(
      new Request("http://localhost/api/project/project-1/maintainers", {
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
        }),
      },
    );

    expect(removeProjectMaintainer).toHaveBeenCalledWith(
      "viewer-1",
      "project-1",
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(response.status).toBe(200);
  });

  it("returns forbidden when a non-owner manages maintainers", async () => {
    addProjectMaintainer.mockResolvedValue({ error: "forbidden" });

    const response = await POST(
      new Request("http://localhost/api/project/project-1/maintainers", {
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
        }),
      },
    );

    expect(response.status).toBe(403);
  });
});
