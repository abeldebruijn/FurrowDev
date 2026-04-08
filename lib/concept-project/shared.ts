export const conceptProjectStages = ["what", "for_whom", "how", "setup"] as const;

export type ConceptProjectStage = (typeof conceptProjectStages)[number];

export type ConceptProjectChatAuthor = "agent" | "person";

export type ConceptProjectRoadmapDraftItem = {
  name: string;
  description?: string | null;
};

export const CONCEPT_PROJECT_OPENING_MESSAGE =
  "Describe in less than 128 words what this project is about.";

export const CONCEPT_PROJECT_STAGE_LABELS: Record<ConceptProjectStage, string> = {
  what: "What",
  for_whom: "For Whom",
  how: "How",
  setup: "Setup",
};

export function getConceptProjectStageIndex(stage: ConceptProjectStage) {
  return conceptProjectStages.indexOf(stage);
}

export function getNextConceptProjectStage(stage: Exclude<ConceptProjectStage, "setup">) {
  const nextStage = conceptProjectStages[getConceptProjectStageIndex(stage) + 1];

  if (!nextStage) {
    return "setup";
  }

  return nextStage;
}

export function getConceptProjectWordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
