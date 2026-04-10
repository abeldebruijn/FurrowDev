import { InferAgentUIMessage, ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";

import {
  type AccessibleConceptProject,
  applyConceptProjectSetupUnderstanding,
  applyConceptProjectStageUnderstanding,
  appendConceptProjectChatMessage,
  getAccessibleConceptProject,
  type ConceptProjectRoadmapItem,
} from "@/lib/concept-project/server";
import {
  type ConceptProjectRoadmapDraftItem,
  type ConceptProjectStage,
  type ConceptProjectVersionedRoadmapDraftItem,
  CONCEPT_PROJECT_OPENING_MESSAGE,
  getNextConceptProjectStage,
} from "@/lib/concept-project/shared";
import { buildConceptProjectSetupSummary } from "@/lib/concept-project/setup";
import { normalizeRoadmapItemName } from "@/lib/concept-project/roadmap";
import { getDb } from "@/lib/db";

const CONCEPT_PROJECT_MODEL = "anthropic/claude-sonnet-4.6";

const stageCompletionSchema = z.object({
  description: z.string().trim().min(1).max(600),
  name: z.string().trim().min(1).max(120),
  roadmapItems: z
    .array(
      z.object({
        description: z.string().trim().max(280).optional(),
        majorVersion: z.int().min(1),
        minorVersion: z.int().min(0),
        name: z.string().trim().min(1).max(120),
      }),
    )
    .min(1)
    .max(8),
  summary: z.string().trim().min(1).max(600),
});

const setupCompletionSchema = z.object({
  framework: z.string().trim().min(1).max(120),
  libraries: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  monorepoRecommendation: z.string().trim().min(1).max(160),
  primaryLanguage: z.string().trim().min(1).max(80),
  roadmapItems: z
    .array(
      z.object({
        description: z.string().trim().max(280).optional(),
        name: z.string().trim().min(1).max(120),
      }),
    )
    .min(4)
    .max(8),
  skills: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  summary: z.string().trim().min(1).max(600),
});

type ConceptProjectAgentContext = {
  chatId: string;
  conceptProject: AccessibleConceptProject;
  roadmapItems: ConceptProjectRoadmapItem[];
  viewerId: string;
  viewerName: string;
};

function sanitizeRoadmapItems(items: ConceptProjectRoadmapDraftItem[]) {
  return items.map((item) => ({
    description: item.description?.trim() || null,
    name: normalizeRoadmapItemName(item.name),
  }));
}

function sanitizeVersionedRoadmapItems(items: ConceptProjectVersionedRoadmapDraftItem[]) {
  return items.map((item) => ({
    description: item.description?.trim() || null,
    majorVersion: item.majorVersion,
    minorVersion: item.minorVersion,
    name: normalizeRoadmapItemName(item.name),
  }));
}

function buildProjectSnapshot({
  conceptProject,
  roadmapItems,
  viewerName,
}: ConceptProjectAgentContext) {
  const roadmapText =
    roadmapItems.length > 0
      ? roadmapItems
          .map(
            (item) =>
              `- v${item.majorVersion}.${item.minorVersion} | ${item.name}: ${item.description?.trim() || "No description yet."}`,
          )
          .join("\n")
      : "- No roadmap drafted yet.";

  return [
    `User name: ${viewerName}`,
    `Current concept project name: ${conceptProject.name?.trim() || "Untitled concept project"}`,
    `Current concept project description: ${conceptProject.description?.trim() || "No description yet."}`,
    `What summary: ${conceptProject.whatSummary?.trim() || "Unknown"}`,
    `For whom summary: ${conceptProject.forWhomSummary?.trim() || "Unknown"}`,
    `How summary: ${conceptProject.howSummary?.trim() || "Unknown"}`,
    `Setup summary: ${conceptProject.setupSummary?.trim() || "Unknown"}`,
    "Current roadmap draft:",
    roadmapText,
  ].join("\n");
}

function buildPersistingOnFinish(context: ConceptProjectAgentContext, stage: ConceptProjectStage) {
  const stageCompletionTools = new Set([
    "understandsWhat",
    "understandsForWhom",
    "understandsHow",
    "understandsSetup",
  ]);

  return async (event: {
    steps: Array<{
      toolCalls: Array<{
        toolName: string;
      }>;
    }>;
    text: string;
  }) => {
    const didCompleteStage = event.steps.some((step) =>
      step.toolCalls.some((toolCall) => stageCompletionTools.has(toolCall.toolName)),
    );

    if (didCompleteStage) {
      return;
    }

    const message = event.text.trim();

    if (!message) {
      return;
    }

    const db = getDb();
    const latestConceptProject = await getAccessibleConceptProject(
      context.viewerId,
      context.conceptProject.id,
      db,
    );

    if (!latestConceptProject || latestConceptProject.currentStage !== stage) {
      return;
    }

    await db.transaction(async (tx) => {
      await appendConceptProjectChatMessage(tx, {
        chatId: context.chatId,
        message,
        stage,
        type: "agent",
      });
    });
  };
}

function createStageTools(context: ConceptProjectAgentContext) {
  const executeStageUnderstanding = async (
    stage: Exclude<ConceptProjectStage, "setup">,
    input: z.infer<typeof stageCompletionSchema>,
  ) => {
    const db = getDb();
    const latestConceptProject = await getAccessibleConceptProject(
      context.viewerId,
      context.conceptProject.id,
      db,
    );

    if (!latestConceptProject) {
      throw new Error("Concept project not found");
    }

    if (latestConceptProject.currentStage !== stage) {
      throw new Error(`Concept project is not in the ${stage} stage`);
    }

    await db.transaction(async (tx) => {
      await applyConceptProjectStageUnderstanding(
        tx,
        {
          conceptProjectId: latestConceptProject.id,
          description: input.description,
          name: input.name,
          roadmapItems: sanitizeVersionedRoadmapItems(input.roadmapItems),
          stage,
          summary: input.summary,
        },
        latestConceptProject.roadmapId,
      );
    });

    return {
      nextStage: getNextConceptProjectStage(stage),
      ok: true,
    };
  };

  return {
    understandsHow: tool({
      description:
        "Use this only once you understand the technical shape well enough to persist the how summary, draft artifacts, and transition the concept project into setup.",
      inputSchema: stageCompletionSchema,
      execute: async (input) => executeStageUnderstanding("how", input),
    }),
    understandsForWhom: tool({
      description:
        "Use this only once you understand the target users, scale, and niche well enough to persist the for whom summary, draft artifacts, and hand off to how.",
      inputSchema: stageCompletionSchema,
      execute: async (input) => executeStageUnderstanding("for_whom", input),
    }),
    understandsWhat: tool({
      description:
        "Use this only once you understand the project concept well enough to persist the what summary, draft artifacts, and hand off to for whom.",
      inputSchema: stageCompletionSchema,
      execute: async (input) => executeStageUnderstanding("what", input),
    }),
    understandsSetup: tool({
      description:
        "Use this only once you understand the setup direction well enough to persist the setup summary and append a v0.0 setup roadmap without changing the product name or description.",
      inputSchema: setupCompletionSchema,
      execute: async (input) => {
        const db = getDb();
        const latestConceptProject = await getAccessibleConceptProject(
          context.viewerId,
          context.conceptProject.id,
          db,
        );

        if (!latestConceptProject) {
          throw new Error("Concept project not found");
        }

        if (latestConceptProject.currentStage !== "setup") {
          throw new Error("Concept project is not in the setup stage");
        }

        const setupSummary = buildConceptProjectSetupSummary(input);

        await db.transaction(async (tx) => {
          await applyConceptProjectSetupUnderstanding(
            tx,
            {
              conceptProjectId: latestConceptProject.id,
              roadmapItems: sanitizeRoadmapItems(input.roadmapItems),
              summary: setupSummary,
            },
            latestConceptProject.roadmapId,
          );
        });

        return {
          nextStage: "setup" as const,
          ok: true,
        };
      },
    }),
  };
}

type ConceptProjectTools = ReturnType<typeof createStageTools>;
type ConceptProjectStageAgent = ToolLoopAgent<never, ConceptProjectTools>;
type StageAgentFactory = (context: ConceptProjectAgentContext) => ConceptProjectStageAgent;

function createWhatInstructions(context: ConceptProjectAgentContext) {
  return [
    "You are the What agent for a Concept Project discovery flow.",
    `The opening prompt for this stage is exactly: "${CONCEPT_PROJECT_OPENING_MESSAGE}"`,
    "That opening prompt has already been sent in the persisted transcript. Do not repeat it unless the user explicitly asks to restart.",
    "Your job is to understand what the user wants to build.",
    "Ask only focused follow-up questions that are still needed.",
    "Use inspiration, differences from inspiration, data in/data out, and whether this is an app, library, game, or something else only when relevant.",
    "Ask one compact question at a time.",
    "When you clearly understand the project, call understandsWhat.",
    "The summary must capture the essence of the project in plain language.",
    "The name should feel specific and product-ready.",
    "The description should be short and concrete.",
    "Draft 3 to 6 roadmap items with explicit majorVersion and minorVersion values.",
    "Roadmap titles must not include version text because versions are stored separately.",
    "You may assign future versions such as v2.0 when the user makes the sequencing explicit.",
    "After you call the tool, do not add extra text.",
    "Project context:",
    buildProjectSnapshot(context),
  ].join("\n");
}

function createForWhomInstructions(context: ConceptProjectAgentContext) {
  return [
    "You are the For Whom agent for a Concept Project discovery flow.",
    "Your job is to understand who the project is for and the expected scope of usage.",
    "You already know everything collected in earlier stages.",
    "Ask only relevant questions about user volume, languages, niche, distribution, and whether the project already exists.",
    "Ask one compact question at a time.",
    "Do not repeat what is already settled unless the user changes it.",
    "When you clearly understand the audience and scale, call understandsForWhom.",
    "You may refine the draft name, description, roadmap titles, roadmap descriptions, and roadmap versions if the new audience context changes them.",
    "Roadmap titles must not include version text because versions are stored separately.",
    "After you call the tool, do not add extra text.",
    "Project context:",
    buildProjectSnapshot(context),
  ].join("\n");
}

function createHowInstructions(context: ConceptProjectAgentContext) {
  return [
    "You are the How agent for a Concept Project discovery flow.",
    "Your job is to understand the high-level implementation needs, not to generate setup instructions yet.",
    "Ask only relevant questions about authentication, database needs, mobile friendliness, accessibility, and other major product constraints.",
    "Ask one compact question at a time.",
    "Do not revisit already settled audience or product-concept topics unless the user changes them.",
    "When you clearly understand the technical shape, call understandsHow.",
    "You may refine the draft name, description, roadmap titles, roadmap descriptions, and roadmap versions if the how constraints change them.",
    "Roadmap titles must not include version text because versions are stored separately.",
    "Use explicit roadmap versions and keep future major jumps like v2.0 when the user asks for them.",
    "After you call the tool, do not add extra text.",
    "Project context:",
    buildProjectSnapshot(context),
  ].join("\n");
}

function createSetupInstructions(context: ConceptProjectAgentContext) {
  return [
    "You are the Setup agent for a Concept Project discovery flow.",
    "Your job is to define how this project should be bootstrapped and structured.",
    "You already know the product, audience, and high-level technical shape.",
    "Ask compact questions one at a time.",
    "Prioritize these topics in order unless already settled: monorepo or single repo, primary language, framework, core libraries or infrastructure, then relevant skills or tooling.",
    "Only ask libraries and skills questions if they are still unresolved.",
    "If the user asks for suggestions or says they do not know, provide 3 to 5 concrete directions.",
    "For each suggested direction include: a short recommendation line, pros, cons, and when it fits.",
    "Lead with an opinionated default when appropriate.",
    "Keep setup focused on implementation bootstrap, not product brainstorming.",
    "When you clearly understand the setup direction, call understandsSetup.",
    "The roadmap items must be setup tasks, not product features.",
    "All setup roadmap items belong to the v0.0 setup group.",
    "Make sure the setup roadmap covers project bootstrap, repo layout, framework initialization, core libraries, skills/tooling setup, and the initial folder structure or app shell.",
    "Roadmap titles must not include version text because versions are stored separately.",
    "Do not change the project name or description in this stage.",
    "After you call the tool, do not add extra text.",
    "Project context:",
    buildProjectSnapshot(context),
  ].join("\n");
}

export const createWhatAgent: StageAgentFactory = (context) =>
  new ToolLoopAgent({
    activeTools: ["understandsWhat"],
    instructions: createWhatInstructions(context),
    model: CONCEPT_PROJECT_MODEL,
    onFinish: buildPersistingOnFinish(context, "what"),
    stopWhen: stepCountIs(10),
    tools: createStageTools(context),
  });

export const createForWhomAgent: StageAgentFactory = (context) =>
  new ToolLoopAgent({
    activeTools: ["understandsForWhom"],
    instructions: createForWhomInstructions(context),
    model: CONCEPT_PROJECT_MODEL,
    onFinish: buildPersistingOnFinish(context, "for_whom"),
    stopWhen: stepCountIs(10),
    tools: createStageTools(context),
  });

export const createHowAgent: StageAgentFactory = (context) =>
  new ToolLoopAgent({
    activeTools: ["understandsHow"],
    instructions: createHowInstructions(context),
    model: CONCEPT_PROJECT_MODEL,
    onFinish: buildPersistingOnFinish(context, "how"),
    stopWhen: stepCountIs(10),
    tools: createStageTools(context),
  });

export const createSetupAgent: StageAgentFactory = (context) =>
  new ToolLoopAgent({
    activeTools: ["understandsSetup"],
    instructions: createSetupInstructions(context),
    model: CONCEPT_PROJECT_MODEL,
    onFinish: buildPersistingOnFinish(context, "setup"),
    stopWhen: stepCountIs(12),
    tools: createStageTools(context),
  });

export type ConceptProjectAgentUIMessage = InferAgentUIMessage<ConceptProjectStageAgent>;
