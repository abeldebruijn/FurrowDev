import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { getWorkOSSession, moveProjectOwnership, upsertViewerFromWorkOSSession } = vi.hoisted(
  () => ({
    getWorkOSSession: vi.fn(),
    moveProjectOwnership: vi.fn(),
    upsertViewerFromWorkOSSession: vi.fn(),
  }),
);

vi.mock("@/lib/project/server", () => ({
  moveProjectOwnership,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { PATCH } from "../app/api/project/[project-id]/ownership/route";

describe("project ownership route", () => {
  beforeEach(() => {
    getWorkOSSession.mockReset();
    moveProjectOwnership.mockReset();
    upsertViewerFromWorkOSSession.mockReset();

    getWorkOSSession.mockResolvedValue({
      user: {
        id: "workos-user-1",
      },
    });
    upsertViewerFromWorkOSSession.mockResolvedValue({
      id: "viewer-1",
    });
    moveProjectOwnership.mockResolvedValue({ error: null });
  });

  it("moves a project to an organisation", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ownership", {
        body: JSON.stringify({
          orgOwnerId: "550e8400-e29b-41d4-a716-446655440000",
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

    expect(moveProjectOwnership).toHaveBeenCalledWith(
      "viewer-1",
      "project-1",
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(response.status).toBe(200);
  });

  it("moves a project back to personal ownership", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ownership", {
        body: JSON.stringify({
          orgOwnerId: null,
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

    expect(moveProjectOwnership).toHaveBeenCalledWith("viewer-1", "project-1", null);
    expect(response.status).toBe(200);
  });

  it("rejects invalid ownership payloads", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/project/project-1/ownership", {
        body: JSON.stringify({
          orgOwnerId: "not-a-uuid",
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

    expect(response.status).toBe(400);
    expect(moveProjectOwnership).not.toHaveBeenCalled();
  });
});
