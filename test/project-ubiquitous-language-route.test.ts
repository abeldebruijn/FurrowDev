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

  it("returns 401 when there is no session", async () => {
    getWorkOSSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/project/project-1/ubiquitous-language", {
        method: "POST",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(401);
    expect(generateAccessibleProjectUbiquitousLanguage).not.toHaveBeenCalled();
  });

  it("returns ok:true in the response body on success", async () => {
    const response = await POST(
      new Request("http://localhost/api/project/project-1/ubiquitous-language", {
        method: "POST",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it("passes the correct project id from the route params", async () => {
    await POST(
      new Request("http://localhost/api/project/another-project-id/ubiquitous-language", {
        method: "POST",
      }) as any,
      { params: Promise.resolve({ "project-id": "another-project-id" }) },
    );

    expect(generateAccessibleProjectUbiquitousLanguage).toHaveBeenCalledWith(
      "viewer-1",
      "another-project-id",
    );
  });

  it("returns the error message in the 404 response body", async () => {
    generateAccessibleProjectUbiquitousLanguage.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/project/project-1/ubiquitous-language", {
        method: "POST",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});
