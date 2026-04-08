export const conceptProjectStages = ["what", "for_whom", "how", "setup"] as const;

export type ConceptProjectStage = (typeof conceptProjectStages)[number];

export type ConceptProjectChatAuthor = "agent" | "person";

export type ConceptProjectRoadmapDraftItem = {
  name: string;
  description?: string | null;
};

export const CONCEPT_PROJECT_OPENING_MESSAGE = `I'm here to help you create the perfect foundation for your coding project!
By understanding what you're building, I'll generate a project name, detailed description, and an initial roadmap tailored specifically to your needs.
Here's what I'll do:
- Generate a compelling project name
- Create a clear project description
- Build an initial development roadmap
- Provide setup recommendations

**What I need from you**:
Please tell me *what* your project is about in a few sentences (less than 128 words). We will later go into detail about for whom, how and why you need this project.
`;

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
