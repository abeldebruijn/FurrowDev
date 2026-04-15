import { InferAgentUIMessage, ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";

import type { AccessibleVision } from "@/lib/vision/server";
import type { ProjectRoadmap, ProjectRoadmapItem } from "@/lib/project/server";

const VISION_MODEL = "anthropic/claude-sonnet-4.6";

type VisionAgentContext = {
  onFinish: (message: string) => Promise<void>;
  project: {
    description: string | null;
    ubiquitousLanguageMarkdown: string | null;
  };
  roadmap: ProjectRoadmap;
  roadmapItems: ProjectRoadmapItem[];
  vision: Pick<AccessibleVision, "summary" | "title">;
};

function buildVisionInstructions(context: VisionAgentContext) {
  const roadmapText =
    context.roadmapItems.length === 0
      ? "- No roadmap items available."
      : context.roadmapItems
          .map(
            (item) =>
              `- v${item.majorVersion}.${item.minorVersion} | ${item.name}: ${item.description?.trim() || "No description yet."}`,
          )
          .join("\n");

  return [
    "You are the Vision discovery agent for a private FurrowDev conversation.",
    "The user is exploring what they want to build before it becomes a public idea.",
    "Keep replies concise, concrete, and helpful.",
    "Ask at most one focused follow-up question at a time when important uncertainty remains.",
    "When the user asks for options, give 3 to 5 distinct directions with a recommendation.",
    "Use the project context tool when roadmap, description, or ubiquitous language context would materially improve the discussion.",
    "Do not mention hidden summaries, internal tools, or private storage.",
    `Vision title: ${context.vision.title}`,
    "Current hidden summary:",
    context.vision.summary.trim() || "No summary yet.",
    "Known project description:",
    context.project.description?.trim() || "No project description.",
    "Known ubiquitous language:",
    context.project.ubiquitousLanguageMarkdown?.trim() || "No ubiquitous language yet.",
    "Known roadmap snapshot:",
    context.roadmap
      ? `Current v${context.roadmap.currentMajor}.${context.roadmap.currentMinor}`
      : "No current roadmap version.",
    roadmapText,
  ].join("\n");
}

function createVisionTools(context: VisionAgentContext) {
  return {
    getProjectContext: tool({
      description:
        "Return the current project description, ubiquitous language markdown, roadmap version, and roadmap items when that context would help guide the vision discussion.",
      execute: async () => ({
        description: context.project.description,
        currentVersion: context.roadmap
          ? {
              majorVersion: context.roadmap.currentMajor,
              minorVersion: context.roadmap.currentMinor,
            }
          : null,
        items: context.roadmapItems.map((item) => ({
          description: item.description,
          majorVersion: item.majorVersion,
          minorVersion: item.minorVersion,
          name: item.name,
        })),
        ubiquitousLanguageMarkdown: context.project.ubiquitousLanguageMarkdown,
      }),
      inputSchema: z.object({}),
    }),
  };
}

type VisionTools = ReturnType<typeof createVisionTools>;
type VisionAgent = ToolLoopAgent<never, VisionTools>;

export function createVisionAgent(context: VisionAgentContext): VisionAgent {
  return new ToolLoopAgent({
    activeTools: ["getProjectContext"],
    instructions: buildVisionInstructions(context),
    model: VISION_MODEL,
    onFinish: async (event) => {
      const message = event.text.trim();

      if (!message) {
        return;
      }

      await context.onFinish(message);
    },
    stopWhen: stepCountIs(10),
    tools: createVisionTools(context),
  });
}

export type VisionAgentUIMessage = InferAgentUIMessage<VisionAgent>;
