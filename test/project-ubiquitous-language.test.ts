import { describe, expect, it } from "vite-plus/test";

import { buildFallbackProjectUbiquitousLanguageMarkdown } from "../lib/project/ubiquitous-language";

describe("buildFallbackProjectUbiquitousLanguageMarkdown", () => {
  it("builds the expected markdown structure from concept-project discovery data", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: "A product studio that turns early concepts into staffed delivery projects.",
      forWhomSummary: "Independent founders and small product teams who need help shipping.",
      howSummary:
        'The team uses a "graduation" workflow that locks discovery language before delivery.',
      name: "Furrow",
      roadmapItems: [
        {
          description: "Move a concept into a staffed project with preserved context.",
          majorVersion: 1,
          minorVersion: 0,
          name: "Graduation flow",
        },
      ],
      setupSummary: "The roadmap becomes the execution contract once the concept is ready.",
      transcript: [
        {
          message: "We want the concept to graduate into a real project without losing language.",
          type: "person",
        },
      ],
      whatSummary:
        'A workflow for turning a concept into a real delivery track around "graduation".',
    });

    expect(markdown).toContain("# Ubiquitous Language");
    expect(markdown).toContain("## Core terms");
    expect(markdown).toContain("| **Furrow** |");
    expect(markdown).toContain("| **Graduation flow** |");
    expect(markdown).toContain("## Relationships");
    expect(markdown).toContain("## Example dialogue");
    expect(markdown).toContain("## Flagged ambiguities");
    expect(markdown).toContain("**graduation**");
  });

  it("adds explicit ambiguity notes when discovery inputs are sparse", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: null,
      howSummary: null,
      name: null,
      roadmapItems: [],
      setupSummary: null,
      transcript: [],
      whatSummary: null,
    });

    expect(markdown).toContain("The target **Audience** is still vague");
    expect(markdown).toContain("The delivery **Approach** is still broad");
    expect(markdown).toContain("A **Concept project** becomes one **Project**");
  });
});
