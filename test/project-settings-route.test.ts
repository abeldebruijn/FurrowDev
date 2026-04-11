import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  updateAccessibleProject,
  getWorkOSSession,
  upsertViewerFromWorkOSSession,
} = vi.hoisted(() => ({
  getWorkOSSession: vi.fn(),
  updateAccessibleProject: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/project/server", () => ({
  updateAccessibleProject,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { PATCH } from "../app/api/project/[project-id]/settings/route";

describe("PATCH /api/project/[project-id]/settings", () => {
  beforeEach(() => {
    updateAccessibleProject.mockReset();
    getWorkOSSession.mockReset();
    upsertViewerFromWorkOSSession.mockReset();

    getWorkOSSession.mockResolvedValue({ user: { id: "workos-user-1" } });
    upsertViewerFromWorkOSSession.mockResolvedValue({ id: "viewer-1" });
    updateAccessibleProject.mockResolvedValue({
      id: "project-1",
    });
  });

  it("accepts ubiquitous language markdown updates", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({
          ubiquitousLanguageMarkdown: "# Ubiquitous Language\n\n## Core terms",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(updateAccessibleProject).toHaveBeenCalledWith("viewer-1", "project-1", {
      ubiquitousLanguageMarkdown: "# Ubiquitous Language\n\n## Core terms",
    });
  });

  it("rejects an empty update payload", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(400);
    expect(updateAccessibleProject).not.toHaveBeenCalled();
  });
});
