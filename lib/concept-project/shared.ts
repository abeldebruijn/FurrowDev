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

export const CONCEPT_PROJECT_STAGE_INTRO_MESSAGES: Record<ConceptProjectStage, string> = {
  what: CONCEPT_PROJECT_OPENING_MESSAGE,
  for_whom:
    "Now that I understand what you want to build, let’s define who this is for. Tell me about the users, audience, and expected scale. Do you expect this project to be a **small prototype** or a **full-scale application**?",
  how: "We now know what the project is and who it serves. Next, let’s shape how it should work at a high level: constraints, technical needs, and product qualities. Does the project need to be mobile-friendly?",
  setup:
    "We have enough product context. Now let’s define the setup: should this be a monorepo, what primary language should it use, what framework fits best, and which libraries or skills are needed to bootstrap it well?",
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
