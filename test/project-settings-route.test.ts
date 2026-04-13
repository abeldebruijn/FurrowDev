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

  it("returns 401 when there is no session", async () => {
    getWorkOSSession.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({ name: "New name" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(401);
    expect(updateAccessibleProject).not.toHaveBeenCalled();
  });

  it("returns 404 when the project is not found", async () => {
    updateAccessibleProject.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({ name: "New name" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid JSON body", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: "not-json",
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(400);
    expect(updateAccessibleProject).not.toHaveBeenCalled();
  });

  it("accepts a name-only update and passes it to updateAccessibleProject", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({ name: "Renamed project" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateAccessibleProject).toHaveBeenCalledWith("viewer-1", "project-1", {
      name: "Renamed project",
    });
  });

  it("accepts a description-only update and passes it to updateAccessibleProject", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({ description: "Updated description" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateAccessibleProject).toHaveBeenCalledWith("viewer-1", "project-1", {
      description: "Updated description",
    });
  });

  it("accepts all three fields in a single update", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({
          description: "A description",
          name: "Full update",
          ubiquitousLanguageMarkdown: "# Ubiquitous Language\n\n## Core terms",
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateAccessibleProject).toHaveBeenCalledWith("viewer-1", "project-1", {
      description: "A description",
      name: "Full update",
      ubiquitousLanguageMarkdown: "# Ubiquitous Language\n\n## Core terms",
    });
  });

  it("rejects a name that exceeds the 120-character limit", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({ name: "a".repeat(121) }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(400);
    expect(updateAccessibleProject).not.toHaveBeenCalled();
  });

  it("rejects a name that is empty after trimming", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({ name: "   " }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(400);
    expect(updateAccessibleProject).not.toHaveBeenCalled();
  });

  it("rejects a description that exceeds the 600-character limit", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({ description: "d".repeat(601) }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(400);
    expect(updateAccessibleProject).not.toHaveBeenCalled();
  });

  it("rejects ubiquitousLanguageMarkdown that exceeds the 30000-character limit", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({ ubiquitousLanguageMarkdown: "x".repeat(30001) }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(400);
    expect(updateAccessibleProject).not.toHaveBeenCalled();
  });

  it("accepts ubiquitousLanguageMarkdown at exactly the 30000-character limit", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({ ubiquitousLanguageMarkdown: "x".repeat(30000) }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateAccessibleProject).toHaveBeenCalled();
  });

  it("returns ok:true in the response body on success", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/settings", {
        body: JSON.stringify({ name: "Ok response test" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      { params: Promise.resolve({ "project-id": "project-1" }) },
    );

    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });
});