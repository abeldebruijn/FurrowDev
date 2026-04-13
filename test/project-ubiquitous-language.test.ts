import { describe, expect, it, vi } from "vite-plus/test";

const { generateText } = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock("ai", () => ({ generateText }));

import {
  buildFallbackProjectUbiquitousLanguageMarkdown,
  generateProjectUbiquitousLanguageMarkdown,
} from "../lib/project/ubiquitous-language";

describe("buildFallbackProjectUbiquitousLanguageMarkdown", () => {
  it("builds the expected markdown structure from concept-project discovery data", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: "A product studio that turns early concepts into staffed delivery projects.",
      forWhomSummary: "Independent founders and small product teams who need help shipping.",
      howSummary: 'The team uses a "graduation" workflow that locks discovery language before delivery.',
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
      whatSummary: 'A workflow for turning a concept into a real delivery track around "graduation".',
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

  it("omits audience and approach ambiguity notes when both summaries are provided", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: "Small teams who need help shipping.",
      howSummary: "We use a graduation workflow.",
      name: null,
      roadmapItems: [],
      setupSummary: null,
      transcript: [],
      whatSummary: null,
    });

    expect(markdown).not.toContain("The target **Audience** is still vague");
    expect(markdown).not.toContain("The delivery **Approach** is still broad");
    // Always-present ambiguity note should still be present
    expect(markdown).toContain('"project" should mean the graduated execution record');
  });

  it("escapes pipe characters in terms and definitions to keep tables valid", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: null,
      howSummary: null,
      name: null,
      roadmapItems: [
        {
          description: "A | B split capability.",
          majorVersion: 1,
          minorVersion: 0,
          name: "A | B toggle",
        },
      ],
      setupSummary: null,
      transcript: [],
      whatSummary: null,
    });

    expect(markdown).toContain("A \\| B toggle");
    expect(markdown).toContain("A \\| B split capability");
  });

  it("extracts quoted terms from discovery summaries into an emerging domain terms section", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: null,
      howSummary: null,
      name: "TestProject",
      roadmapItems: [],
      setupSummary: null,
      transcript: [],
      whatSummary: 'Turns "concepts" into shipped "projects" using a "workflow".',
    });

    expect(markdown).toContain("## Emerging domain terms");
    expect(markdown).toContain("| **concepts** |");
    expect(markdown).toContain("| **projects** |");
    expect(markdown).toContain("| **workflow** |");
  });

  it("caps extracted quoted terms at three entries", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: '"alpha" and "beta" are key actors.',
      howSummary: '"gamma" approach is core.',
      name: null,
      roadmapItems: [],
      setupSummary: null,
      transcript: [],
      whatSummary: '"delta" ships things.',
    });

    const emergingSection = markdown.split("## Emerging domain terms")[1] ?? "";
    // Only the first 3 across whatSummary, forWhomSummary, howSummary should appear
    // whatSummary: delta, forWhomSummary: alpha, beta — that's 3 already; gamma should be dropped
    const rowMatches = emergingSection.match(/\| \*\*/g) ?? [];
    expect(rowMatches.length).toBe(3);
  });

  it("adds a roadmap vocabulary section when roadmap items are provided", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: null,
      howSummary: null,
      name: "Project",
      roadmapItems: [
        { description: "Core onboarding.", majorVersion: 1, minorVersion: 0, name: "Onboarding" },
      ],
      setupSummary: null,
      transcript: [],
      whatSummary: null,
    });

    expect(markdown).toContain("## Roadmap vocabulary");
    expect(markdown).toContain("| **Onboarding** |");
  });

  it("caps roadmap vocabulary at five entries", () => {
    const roadmapItems = Array.from({ length: 7 }, (_, i) => ({
      description: `Description ${i}.`,
      majorVersion: 1,
      minorVersion: i,
      name: `Item ${i}`,
    }));

    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: null,
      howSummary: null,
      name: null,
      roadmapItems,
      setupSummary: null,
      transcript: [],
      whatSummary: null,
    });

    // Items 0-4 appear, Items 5 and 6 are dropped
    expect(markdown).toContain("| **Item 4** |");
    expect(markdown).not.toContain("| **Item 5** |");
    expect(markdown).not.toContain("| **Item 6** |");
  });

  it("includes a relationships entry for roadmap capabilities when items are present", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: null,
      howSummary: null,
      name: null,
      roadmapItems: [
        { description: null, majorVersion: 1, minorVersion: 0, name: "Feature launch" },
      ],
      setupSummary: null,
      transcript: [],
      whatSummary: null,
    });

    expect(markdown).toContain("**Feature launch**");
    expect(markdown).toContain("## Relationships");
  });

  it("omits the roadmap capabilities line from relationships when there are no roadmap items", () => {
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

    // The line about "versioned capabilities" should be absent when no items exist
    expect(markdown).not.toContain("versioned capabilities");
  });

  it("uses setup summary as roadmap definition when present", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: null,
      howSummary: null,
      name: null,
      roadmapItems: [],
      setupSummary: "The roadmap is the execution contract.",
      transcript: [],
      whatSummary: null,
    });

    // The roadmap definition should be derived from setupSummary
    expect(markdown).toContain("The roadmap is the execution contract");
  });

  it("truncates very long definitions to 220 characters", () => {
    const longDescription = "Word ".repeat(50); // 250 chars
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: longDescription,
      forWhomSummary: null,
      howSummary: null,
      name: "LongProject",
      roadmapItems: [],
      setupSummary: null,
      transcript: [],
      whatSummary: null,
    });

    // The product name entry definition should be truncated with ...
    expect(markdown).toContain("...");
  });

  it("omits the product name row from core terms when name is null", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: "Some description.",
      forWhomSummary: null,
      howSummary: null,
      name: null,
      roadmapItems: [],
      setupSummary: null,
      transcript: [],
      whatSummary: null,
    });

    // "Concept project" and "Project" rows are always present
    expect(markdown).toContain("| **Concept project** |");
    expect(markdown).toContain("| **Project** |");
  });

  it("uses roadmap item name as fallback term in example dialogue and relationships", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: null,
      howSummary: null,
      name: null,
      roadmapItems: [
        { description: null, majorVersion: 2, minorVersion: 1, name: "Launch Campaign" },
      ],
      setupSummary: null,
      transcript: [],
      whatSummary: null,
    });

    expect(markdown).toContain("**Launch Campaign**");
  });

  it("uses fallback description for roadmap items with no description", () => {
    const markdown = buildFallbackProjectUbiquitousLanguageMarkdown({
      description: null,
      forWhomSummary: null,
      howSummary: null,
      name: null,
      roadmapItems: [
        { description: null, majorVersion: 3, minorVersion: 2, name: "No-desc item" },
      ],
      setupSummary: null,
      transcript: [],
      whatSummary: null,
    });

    // Fallback definition includes the version
    expect(markdown).toContain("v3.2");
  });
});

describe("generateProjectUbiquitousLanguageMarkdown", () => {
  const minimalSource = {
    description: null,
    forWhomSummary: null,
    howSummary: null,
    name: "TestProject",
    roadmapItems: [] as { description: string | null; majorVersion: number; minorVersion: number; name: string }[],
    setupSummary: null,
    transcript: [] as { message: string; type: "agent" | "person" }[],
    whatSummary: null,
  };

  it("returns the AI-generated markdown when it starts with the correct heading", async () => {
    const aiMarkdown = "# Ubiquitous Language\n\nAI content here.";
    generateText.mockResolvedValue({ text: `  ${aiMarkdown}  ` });

    const result = await generateProjectUbiquitousLanguageMarkdown(minimalSource);

    expect(result).toBe(aiMarkdown);
  });

  it("falls back to the built-in generator when AI output does not start with the expected heading", async () => {
    generateText.mockResolvedValue({ text: "Some unrelated markdown output." });

    const result = await generateProjectUbiquitousLanguageMarkdown(minimalSource);

    expect(result).toContain("# Ubiquitous Language");
    // Fallback always includes the Core terms section
    expect(result).toContain("## Core terms");
  });

  it("falls back to the built-in generator when the AI call throws", async () => {
    generateText.mockRejectedValue(new Error("API timeout"));

    const result = await generateProjectUbiquitousLanguageMarkdown(minimalSource);

    expect(result).toContain("# Ubiquitous Language");
    expect(result).toContain("## Core terms");
  });

  it("falls back to the built-in generator when AI returns empty text", async () => {
    generateText.mockResolvedValue({ text: "" });

    const result = await generateProjectUbiquitousLanguageMarkdown(minimalSource);

    expect(result).toContain("# Ubiquitous Language");
  });
});