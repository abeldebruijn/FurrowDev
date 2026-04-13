import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  generateAccessibleProjectUbiquitousLanguage,
  getWorkOSSession,
  upsertViewerFromWorkOSSession,
} = vi.hoisted(() => ({
  generateAccessibleProjectUbiquitousLanguage: vi.fn(),
  getWorkOSSession: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/project/server", () => ({
  generateAccessibleProjectUbiquitousLanguage,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { POST } from "../app/api/project/[project-id]/ubiquitous-language/route";

describe("POST /api/project/[project-id]/ubiquitous-language", () => {
  beforeEach(() => {
    generateAccessibleProjectUbiquitousLanguage.mockReset();
    getWorkOSSession.mockReset();
    upsertViewerFromWorkOSSession.mockReset();

    getWorkOSSession.mockResolvedValue({ user: { id: "workos-user-1" } });
    upsertViewerFromWorkOSSession.mockResolvedValue({ id: "viewer-1" });
    generateAccessibleProjectUbiquitousLanguage.mockResolvedValue({ id: "project-1" });
  });

  it("generates ubiquitous language for an accessible project", async () => {
    const response = await POST(
      new Request("http://localhost/api/project/project-1/ubiquitous-language", {
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(generateAccessibleProjectUbiquitousLanguage).toHaveBeenCalledWith(
      "viewer-1",
      "project-1",
    );
  });

  it("returns 404 when the project is missing", async () => {
    generateAccessibleProjectUbiquitousLanguage.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/project/project-1/ubiquitous-language", {
        method: "POST",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(404);
  });
});
