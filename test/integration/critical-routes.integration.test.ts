import { describe, expect, it, vi } from "vite-plus/test";

const { getWorkOSSession, getZeroContext } = vi.hoisted(() => ({
  getWorkOSSession: vi.fn(),
  getZeroContext: vi.fn(),
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  getZeroContext,
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("@/lib/idea/server", () => ({
  getProjectIdeaById: vi.fn(),
  updateProjectIdeaWorkspace: vi.fn(),
}));

vi.mock("@/lib/project/server", () => ({
  moveProjectOwnership: vi.fn(),
}));

vi.mock("@/zero/queries", () => ({
  queries: {},
}));

vi.mock("@/zero/schema", () => ({
  schema: {},
}));

import { PATCH as patchProjectIdea } from "../../app/api/project/[project-id]/ideas/idea/[idea-id]/route";
import { PATCH as patchProjectOwnership } from "../../app/api/project/[project-id]/ownership/route";
import { POST as postZeroQuery } from "../../app/api/zero/query/route";

describe("critical route integration", () => {
  it("rejects unauthenticated idea workspace updates", async () => {
    getWorkOSSession.mockResolvedValueOnce(null);

    const response = await patchProjectIdea(
      new Request("http://localhost/api/project/project-1/ideas/idea/idea-1", {
        body: JSON.stringify({ context: "Updated context" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "idea-id": "idea-1",
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects unauthenticated ownership transfers", async () => {
    getWorkOSSession.mockResolvedValueOnce(null);

    const response = await patchProjectOwnership(
      new Request("http://localhost/api/project/project-1/ownership", {
        body: JSON.stringify({ orgOwnerId: null }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }) as any,
      {
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects unauthenticated Zero query calls", async () => {
    getZeroContext.mockResolvedValueOnce(null);

    const response = await postZeroQuery(
      new Request("http://localhost/api/zero/query", {
        body: JSON.stringify({ args: {}, name: "getProjectById" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }) as any,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
