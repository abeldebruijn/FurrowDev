import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { convertVisionToIdea, ToolLoopAgent, tool } = vi.hoisted(() => ({
  convertVisionToIdea: vi.fn(),
  ToolLoopAgent: vi.fn(function (this: unknown, options) {
    return options;
  }),
  tool: vi.fn((definition) => definition),
}));

vi.mock("ai", () => ({
  InferAgentUIMessage: {},
  stepCountIs: (count: number) => ({ count }),
  ToolLoopAgent,
  tool,
}));

vi.mock("@/lib/idea/server", () => ({
  convertVisionToIdea,
}));

import { createVisionAgent } from "../lib/agents/vision";

describe("createVisionAgent", () => {
  beforeEach(() => {
    convertVisionToIdea.mockReset();
    ToolLoopAgent.mockClear();
    tool.mockClear();
  });

  function createAgentOptions() {
    return createVisionAgent({
      onFinish: async () => {},
      project: {
        description: "Project description",
        id: "project-1",
        ubiquitousLanguageMarkdown: "# Language",
      },
      roadmap: {
        currentMajor: 1,
        currentMinor: 0,
        id: "roadmap-1",
      },
      roadmapItems: [],
      viewerId: "viewer-1",
      vision: {
        id: "vision-1",
        summary: "Summary",
        title: "Vision title",
      },
    }) as any;
  }

  it("registers the understandsVision tool", () => {
    const agent = createAgentOptions();

    expect(agent.activeTools).toContain("understandsVision");
    expect(agent.tools.understandsVision).toBeDefined();
  });

  it("converts the vision through the shared helper", async () => {
    convertVisionToIdea.mockResolvedValue({
      error: null,
      idea: {
        id: "idea-1",
      },
    });
    const agent = createAgentOptions();

    await expect(
      agent.tools.understandsVision.execute({
        roadmapItemId: "550e8400-e29b-41d4-a716-446655440000",
        title: "Shared idea",
      }),
    ).resolves.toEqual({
      ideaId: "idea-1",
      ok: true,
    });
    expect(convertVisionToIdea).toHaveBeenCalledWith("viewer-1", "project-1", "vision-1", {
      roadmapItemId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Shared idea",
    });
  });
});
