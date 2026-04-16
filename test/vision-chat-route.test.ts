import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  appendVisionMessage,
  createAgentUIStreamResponse,
  createVisionAgent,
  getAccessibleVision,
  getDb,
  getProjectAccess,
  getProjectRoadmap,
  getProjectRoadmapItems,
  getVisionMessages,
  getWorkOSSession,
  refreshVisionSummaryDocument,
  upsertViewerFromWorkOSSession,
} = vi.hoisted(() => ({
  appendVisionMessage: vi.fn(),
  createAgentUIStreamResponse: vi.fn(),
  createVisionAgent: vi.fn(),
  getAccessibleVision: vi.fn(),
  getDb: vi.fn(),
  getProjectAccess: vi.fn(),
  getProjectRoadmap: vi.fn(),
  getProjectRoadmapItems: vi.fn(),
  getVisionMessages: vi.fn(),
  getWorkOSSession: vi.fn(),
  refreshVisionSummaryDocument: vi.fn(),
  upsertViewerFromWorkOSSession: vi.fn(),
}));

vi.mock("ai", () => ({
  createAgentUIStreamResponse,
}));

vi.mock("@/lib/agents/vision", () => ({
  createVisionAgent,
}));

vi.mock("@/lib/vision/server", () => ({
  appendVisionMessage,
  getAccessibleVision,
  getVisionMessages,
  refreshVisionSummaryDocument,
}));

vi.mock("@/lib/db", () => ({
  getDb,
}));

vi.mock("@/lib/project/server", () => ({
  getProjectAccess,
  getProjectRoadmap,
  getProjectRoadmapItems,
}));

vi.mock("@/lib/workos-session", () => ({
  getWorkOSSession,
}));

vi.mock("@/lib/zero/context", () => ({
  upsertViewerFromWorkOSSession,
}));

import { POST } from "../app/api/project/[project-id]/ideas/[vision-id]/chat/route";

describe("vision chat route", () => {
  beforeEach(() => {
    appendVisionMessage.mockReset();
    createAgentUIStreamResponse.mockReset();
    createVisionAgent.mockReset();
    getAccessibleVision.mockReset();
    getDb.mockReset();
    getProjectAccess.mockReset();
    getProjectRoadmap.mockReset();
    getProjectRoadmapItems.mockReset();
    getVisionMessages.mockReset();
    getWorkOSSession.mockReset();
    refreshVisionSummaryDocument.mockReset();
    upsertViewerFromWorkOSSession.mockReset();

    getWorkOSSession.mockResolvedValue({
      user: {
        id: "workos-user-1",
      },
    });
    upsertViewerFromWorkOSSession.mockResolvedValue({
      id: "viewer-1",
    });
    getAccessibleVision.mockResolvedValue({
      id: "vision-1",
      ownerName: "Abel",
      ownerUserId: "viewer-1",
      projectId: "project-1",
      summary: "Current summary",
      title: "Checkout rethink",
    });
    getVisionMessages.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        content: "What do you want to explore?",
        id: "assistant-1",
        role: "assistant",
      },
      {
        content: "I want to revisit checkout.",
        id: "user-1",
        role: "user",
      },
    ]);
    getProjectAccess.mockResolvedValue({
      description: "Internal tooling for planning and delivery.",
      roadmapId: "roadmap-1",
      ubiquitousLanguageMarkdown:
        "# Ubiquitous Language\n\n- Vision: a private discovery conversation.",
    });
    getProjectRoadmap.mockResolvedValue({
      currentMajor: 1,
      currentMinor: 2,
      id: "roadmap-1",
    });
    getProjectRoadmapItems.mockResolvedValue([
      {
        description: "Improve conversion",
        id: "item-1",
        majorVersion: 1,
        minorVersion: 2,
        name: "Checkout",
      },
    ]);
    getDb.mockReturnValue({
      transaction: async (callback: (tx: string) => Promise<void>) => callback("tx"),
    });
    createVisionAgent.mockReturnValue("vision-agent");
    createAgentUIStreamResponse.mockReturnValue(new Response("ok"));
  });

  it("persists the submitted user message and streams the agent response", async () => {
    const response = await POST(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/chat", {
        body: JSON.stringify({
          messages: [
            {
              id: "user-1",
              parts: [
                {
                  text: "I want to revisit checkout.",
                  type: "text",
                },
              ],
              role: "user",
            },
          ],
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

    expect(appendVisionMessage).toHaveBeenCalledWith("tx", {
      authorUserId: "viewer-1",
      content: "I want to revisit checkout.",
      id: "user-1",
      role: "user",
      visionId: "vision-1",
    });
    expect(createAgentUIStreamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: "vision-agent",
        uiMessages: [
          {
            id: "assistant-1",
            parts: [{ text: "What do you want to explore?", type: "text" }],
            role: "assistant",
          },
          {
            id: "user-1",
            parts: [{ text: "I want to revisit checkout.", type: "text" }],
            role: "user",
          },
        ],
      }),
    );
    expect(response.status).toBe(200);
  });

  it("rejects invalid JSON bodies", async () => {
    const response = await POST(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/chat", {
        body: "{",
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
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON body." });
  });

  it("rejects non-array messages payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/chat", {
        body: JSON.stringify({
          messages: "not-an-array",
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
    await expect(response.json()).resolves.toEqual({ error: "Invalid messages payload." });
  });

  it("refreshes the hidden summary document after the assistant finishes", async () => {
    await POST(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/chat", {
        body: JSON.stringify({
          messages: [
            {
              id: "user-1",
              parts: [{ text: "I want to revisit checkout.", type: "text" }],
              role: "user",
            },
          ],
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

    const agentArgs = createVisionAgent.mock.calls[0][0] as {
      onFinish: (message: string) => Promise<void>;
    };

    await agentArgs.onFinish("Here is the next angle to explore.");

    expect(appendVisionMessage).toHaveBeenCalledWith("tx", {
      content: "Here is the next angle to explore.",
      role: "assistant",
      visionId: "vision-1",
    });
    expect(refreshVisionSummaryDocument).toHaveBeenCalledWith("vision-1", expect.anything());
  });

  it("passes project description and ubiquitous language into the vision agent context", async () => {
    await POST(
      new Request("http://localhost/api/project/project-1/ideas/vision-1/chat", {
        body: JSON.stringify({
          messages: [
            {
              id: "user-1",
              parts: [{ text: "I want to revisit checkout.", type: "text" }],
              role: "user",
            },
          ],
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

    expect(createVisionAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        project: {
          description: "Internal tooling for planning and delivery.",
          ubiquitousLanguageMarkdown:
            "# Ubiquitous Language\n\n- Vision: a private discovery conversation.",
        },
      }),
    );
  });
});
