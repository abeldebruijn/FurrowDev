"use client";

import type { ConceptProjectAgentUIMessage } from "@/lib/agents/concept-project";
import type {
  ConceptProjectRoadmapCurrentVersion,
  ConceptProjectRoadmapVisualItem,
} from "@/lib/concept-project/roadmap";
import {
  getConceptProjectStageIndex,
  type ConceptProjectStage,
} from "@/lib/concept-project/shared";

export type PersistedMessage = {
  id: string;
  message: string;
  order: number;
  stage: ConceptProjectStage;
  type: "agent" | "person";
};

export type RoadmapItem = ConceptProjectRoadmapVisualItem;

export type ConceptProjectSnapshot = {
  chatId: string;
  currentStage: ConceptProjectStage;
  description: string | null;
  forWhomSummary: string | null;
  howSummary: string | null;
  id: string;
  name: string | null;
  roadmapId: string | null;
  understoodForWhomAt: string | Date | null;
  understoodHowAt: string | Date | null;
  understoodSetupAt: string | Date | null;
  understoodWhatAt: string | Date | null;
  setupSummary: string | null;
  whatSummary: string | null;
};

export type ConceptProjectDiscoveryProps = {
  conceptProjectId: string;
  initialConceptProject: ConceptProjectSnapshot;
  initialMessages: PersistedMessage[];
  initialRoadmap: RoadmapItem[];
  initialRoadmapCurrentVersion: ConceptProjectRoadmapCurrentVersion;
  isArchived?: boolean;
  projectId?: string | null;
  zeroEnabled: boolean;
};

export type RenderMessage = {
  id: string;
  isTransient: boolean;
  stage: ConceptProjectStage;
  text: string;
  type: "agent" | "person";
};

export type RoadmapVersionInsertArgs = {
  description?: string;
  majorVersion: number;
  minorVersion: number;
  name: string;
};

export type RoadmapNodeDraft = {
  description?: string;
  id: string;
  name: string;
};

export type StageProgressCard = {
  body: string;
  buttonLabel: string;
  title: string;
};

export function getStageProgressCard(
  stage: Exclude<ConceptProjectStage, "setup">,
): StageProgressCard {
  switch (stage) {
    case "what":
      return {
        body: "I understand what you want to create. You can keep refining the concept, or continue into who this is for.",
        buttonLabel: "Continue to for whom",
        title: "What Agent",
      };
    case "for_whom":
      return {
        body: "I understand who this project is for and how broad the audience should be. You can keep refining the audience, or continue into how it should work.",
        buttonLabel: "Continue to how",
        title: "For Whom Agent",
      };
    case "how":
      return {
        body: "I understand the technical shape and product constraints. You can keep refining the implementation direction, or continue into setup.",
        buttonLabel: "Continue to setup",
        title: "How Agent",
      };
  }
}

export function isStageComplete(
  conceptProject: ConceptProjectSnapshot,
  stage: ConceptProjectStage,
) {
  switch (stage) {
    case "what":
      return Boolean(conceptProject.understoodWhatAt);
    case "for_whom":
      return Boolean(conceptProject.understoodForWhomAt);
    case "how":
      return Boolean(conceptProject.understoodHowAt);
    case "setup":
      return Boolean(conceptProject.understoodSetupAt);
  }
}

export function getMaxUnlockedStageIndex(conceptProject: ConceptProjectSnapshot) {
  return Math.max(
    getConceptProjectStageIndex(conceptProject.currentStage),
    conceptProject.understoodWhatAt ? getConceptProjectStageIndex("for_whom") : -1,
    conceptProject.understoodForWhomAt ? getConceptProjectStageIndex("how") : -1,
    conceptProject.understoodHowAt ? getConceptProjectStageIndex("setup") : -1,
  );
}

export function getTextFromUIMessage(message: ConceptProjectAgentUIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
    .trim();
}

export function buildRenderedMessages(args: {
  currentStage: ConceptProjectStage;
  messages: PersistedMessage[];
  persistedMessageIds: Set<string>;
  status: string;
  transientMessages: ConceptProjectAgentUIMessage[];
}): RenderMessage[] {
  const persisted: RenderMessage[] = args.messages.map((message) => ({
    id: message.id,
    isTransient: false,
    stage: message.stage,
    text: message.message,
    type: message.type,
  }));

  const pending: RenderMessage[] = args.transientMessages
    .filter((message) => {
      if (message.role === "assistant" && args.status === "ready") {
        return false;
      }

      return !args.persistedMessageIds.has(message.id);
    })
    .map(
      (message): RenderMessage => ({
        id: message.id,
        isTransient: true,
        stage: args.currentStage,
        text: getTextFromUIMessage(message),
        type: message.role === "user" ? "person" : "agent",
      }),
    )
    .filter((message) => message.text.length > 0 || message.type === "agent");

  return [...persisted, ...pending];
}
