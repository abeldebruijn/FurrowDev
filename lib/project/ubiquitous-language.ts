import { generateText } from "ai";

type ConceptTranscriptMessage = {
  message: string;
  type: "agent" | "person";
};

type ConceptRoadmapItem = {
  description: string | null;
  majorVersion: number;
  minorVersion: number;
  name: string;
};

export type ProjectUbiquitousLanguageSource = {
  description: string | null;
  forWhomSummary: string | null;
  howSummary: string | null;
  name: string | null;
  roadmapItems: ConceptRoadmapItem[];
  setupSummary: string | null;
  transcript: ConceptTranscriptMessage[];
  whatSummary: string | null;
};

type GlossaryEntry = {
  aliasesToAvoid: string[];
  definition: string;
  term: string;
};

type GlossaryGroup = {
  entries: GlossaryEntry[];
  heading: string;
};

function escapePipes(value: string) {
  return value.replaceAll("|", "\\|");
}

function normalizeWhitespace(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function firstSentence(value: string | null | undefined, fallback: string) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return fallback;
  }

  const sentence = normalized.match(/.+?[.!?](?:\s|$)/)?.[0]?.trim() ?? normalized;
  return sentence.length > 220 ? `${sentence.slice(0, 217).trimEnd()}...` : sentence;
}

function toDefinition(value: string | null | undefined, fallback: string) {
  const normalized = firstSentence(value, fallback);
  return normalized.endsWith(".") ? normalized.slice(0, -1) : normalized;
}

function uniqueAliases(...values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function createPrompt(source: ProjectUbiquitousLanguageSource) {
  const transcriptText =
    source.transcript.length > 0
      ? source.transcript
          .map((message, index) => `${index + 1}. ${message.type}: ${message.message}`)
          .join("\n")
      : "No transcript available.";

  const roadmapText =
    source.roadmapItems.length > 0
      ? source.roadmapItems
          .map(
            (item) =>
              `- v${item.majorVersion}.${item.minorVersion} ${item.name}: ${item.description ?? "No description."}`,
          )
          .join("\n")
      : "- No roadmap items available.";

  return [
    "Create a Markdown document titled `# Ubiquitous Language` for a graduated project.",
    "Use the exact sections below in this order:",
    "1. One or more grouped glossary tables",
    "2. `## Relationships`",
    "3. `## Example dialogue`",
    "4. `## Flagged ambiguities`",
    "Each glossary table must use columns `Term`, `Definition`, and `Aliases to avoid`.",
    "Definitions must be one sentence and domain-focused.",
    "Be opinionated. Prefer canonical terms and call out ambiguities explicitly.",
    "Only output Markdown.",
    "",
    `Project name: ${source.name?.trim() || "Untitled project"}`,
    `Project description: ${source.description?.trim() || "No description."}`,
    `What summary: ${source.whatSummary?.trim() || "Unknown"}`,
    `For whom summary: ${source.forWhomSummary?.trim() || "Unknown"}`,
    `How summary: ${source.howSummary?.trim() || "Unknown"}`,
    `Setup summary: ${source.setupSummary?.trim() || "Unknown"}`,
    "Roadmap items:",
    roadmapText,
    "Discovery transcript:",
    transcriptText,
  ].join("\n");
}

function extractQuotedTerms(text: string) {
  return [...text.matchAll(/"([^"]{3,80})"/g)].map((match) => match[1]?.trim() || "").filter(Boolean);
}

function buildRoadmapEntries(roadmapItems: ConceptRoadmapItem[]): GlossaryEntry[] {
  return roadmapItems.slice(0, 5).map((item) => ({
    aliasesToAvoid: uniqueAliases("ticket", "task"),
    definition: toDefinition(item.description, `A roadmap capability tracked in version v${item.majorVersion}.${item.minorVersion}`),
    term: item.name.trim(),
  }));
}

export function buildFallbackProjectUbiquitousLanguageMarkdown(
  source: ProjectUbiquitousLanguageSource,
) {
  const productName = normalizeWhitespace(source.name);
  const quotedTerms = [
    ...extractQuotedTerms(source.whatSummary ?? ""),
    ...extractQuotedTerms(source.forWhomSummary ?? ""),
    ...extractQuotedTerms(source.howSummary ?? ""),
  ].slice(0, 3);

  const groups: GlossaryGroup[] = [
    {
      heading: "## Core terms",
      entries: [
        ...(productName
          ? [
              {
                aliasesToAvoid: uniqueAliases("app", "tool", "platform"),
                definition: toDefinition(
                  source.description || source.whatSummary,
                  "The named product that graduates from discovery into execution",
                ),
                term: productName,
              },
            ]
          : []),
        {
          aliasesToAvoid: uniqueAliases("idea", "draft"),
          definition: "A discovery-stage version of the product before execution begins",
          term: "Concept project",
        },
        {
          aliasesToAvoid: uniqueAliases("build", "implementation"),
          definition: "The graduated product record that owns delivery after concept discovery is complete",
          term: "Project",
        },
        {
          aliasesToAvoid: uniqueAliases("plan", "checklist"),
          definition: toDefinition(
            source.setupSummary || source.howSummary,
            "The ordered execution path the project team intends to deliver",
          ),
          term: "Roadmap",
        },
      ],
    },
    {
      heading: "## Discovery terms",
      entries: [
        {
          aliasesToAvoid: uniqueAliases("customer", "account"),
          definition: toDefinition(
            source.forWhomSummary,
            "The primary people or teams the project is intended to serve",
          ),
          term: "Audience",
        },
        {
          aliasesToAvoid: uniqueAliases("solution", "implementation"),
          definition: toDefinition(
            source.whatSummary,
            "The outcome the project is meant to create once it is delivered",
          ),
          term: "Problem space",
        },
        {
          aliasesToAvoid: uniqueAliases("process", "stack"),
          definition: toDefinition(
            source.howSummary,
            "The core operating approach the project uses to deliver its value",
          ),
          term: "Approach",
        },
      ],
    },
  ];

  const roadmapEntries = buildRoadmapEntries(source.roadmapItems);

  if (roadmapEntries.length > 0) {
    groups.push({
      heading: "## Roadmap vocabulary",
      entries: roadmapEntries,
    });
  }

  if (quotedTerms.length > 0) {
    groups.push({
      heading: "## Emerging domain terms",
      entries: quotedTerms.map((term) => ({
        aliasesToAvoid: uniqueAliases("feature", "thing"),
        definition: "A concept explicitly named during discovery that should keep one consistent meaning",
        term,
      })),
    });
  }

  const glossarySections = groups
    .filter((group) => group.entries.length > 0)
    .map((group) =>
      [
        group.heading,
        "",
        "| Term | Definition | Aliases to avoid |",
        "|------|-----------|-----------------|",
        ...group.entries.map(
          (entry) =>
            `| **${escapePipes(entry.term)}** | ${escapePipes(entry.definition)} | ${escapePipes(entry.aliasesToAvoid.join(", ") || "None")} |`,
        ),
      ].join("\n"),
    )
    .join("\n\n");

  const roadmapTerm = source.roadmapItems[0]?.name?.trim() || "Roadmap item";
  const audienceTerm = "Audience";
  const projectTerm = productName || "Project";
  const ambiguityNotes = [
    '- "project" should mean the graduated execution record; use **Concept project** for the pre-graduation discovery artifact.',
    ...(!normalizeWhitespace(source.forWhomSummary)
      ? ['- The target **Audience** is still vague; tighten this term if a more precise actor name emerges.']
      : []),
    ...(!normalizeWhitespace(source.howSummary)
      ? ['- The delivery **Approach** is still broad; split it into narrower terms if the team starts overloading the word.']
      : []),
  ];

  return [
    "# Ubiquitous Language",
    "",
    glossarySections,
    "",
    "## Relationships",
    "",
    `- A **Concept project** becomes one **Project** when graduation happens.`,
    `- A **Project** owns one **Roadmap** snapshot at the moment of graduation.`,
    `- The **${audienceTerm}** shapes how the **${projectTerm}** and **Roadmap** are described.`,
    ...(source.roadmapItems.length > 0
      ? [`- A **Roadmap** contains versioned capabilities such as **${roadmapTerm}**.`]
      : []),
    "",
    "## Example dialogue",
    "",
    `> **Dev:** "When the **Concept project** graduates, does the **Project** keep the same **Roadmap** language?"`,
    `> **Domain expert:** "Yes. Graduation copies the discovery snapshot so the **Project** starts with the same canonical terms."`,
    `> **Dev:** "Should we describe the users as the **${audienceTerm}** everywhere?"`,
    `> **Domain expert:** "Yes. Keep **${audienceTerm}** consistent unless we later replace it with a sharper actor name."`,
    `> **Dev:** "If **${roadmapTerm}** changes, do we update the glossary too?"`,
    `> **Domain expert:** "Yes. The glossary should stay aligned with the current **Project** language."`,
    "",
    "## Flagged ambiguities",
    "",
    ...ambiguityNotes,
  ].join("\n");
}

export async function generateProjectUbiquitousLanguageMarkdown(
  source: ProjectUbiquitousLanguageSource,
) {
  try {
    const result = await generateText({
      model: "anthropic/claude-sonnet-4.6",
      prompt: createPrompt(source),
    });
    const markdown = result.text.trim();

    if (markdown.startsWith("# Ubiquitous Language")) {
      return markdown;
    }
  } catch {}

  return buildFallbackProjectUbiquitousLanguageMarkdown(source);
}
