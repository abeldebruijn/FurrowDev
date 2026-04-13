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

function sanitizeMarkdown(value: string | null | undefined) {
  const normalized = value
    ?.replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized.replace(/[\\`*_{}[\]()#+\-!>|:=]/g, "\\$&");
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
  return [
    ...new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean) as string[]),
  ];
}

function hasRequiredMarkdownSections(markdown: string) {
  const normalized = markdown.trim();

  return (
    normalized.startsWith("# Ubiquitous Language") &&
    /(^|\n)##\s+(Core terms|Glossary|Terms|Discovery terms|Roadmap vocabulary|Emerging domain terms)\s*$/m.test(
      normalized,
    ) &&
    normalized.includes("| Term |") &&
    normalized.includes("| Definition |") &&
    normalized.includes("## Relationships") &&
    normalized.includes("## Example dialogue") &&
    normalized.includes("## Flagged ambiguities")
  );
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
    `Project name: ${normalizeWhitespace(source.name) || "Untitled project"}`,
    `Project description: ${normalizeWhitespace(source.description) || "No description."}`,
    `What summary: ${normalizeWhitespace(source.whatSummary) || "Unknown"}`,
    `For whom summary: ${normalizeWhitespace(source.forWhomSummary) || "Unknown"}`,
    `How summary: ${normalizeWhitespace(source.howSummary) || "Unknown"}`,
    `Setup summary: ${normalizeWhitespace(source.setupSummary) || "Unknown"}`,
    "Roadmap items:",
    roadmapText,
    "Discovery transcript:",
    transcriptText,
  ].join("\n");
}

function extractQuotedTerms(text: string) {
  return [...text.matchAll(/"([^"]{3,80})"/g)]
    .map((match) => match[1]?.trim() || "")
    .filter(Boolean);
}

function buildRoadmapEntries(roadmapItems: ConceptRoadmapItem[]): GlossaryEntry[] {
  return roadmapItems.slice(0, 5).map((item) => ({
    aliasesToAvoid: uniqueAliases("ticket", "task"),
    definition: toDefinition(
      item.description,
      `A roadmap capability tracked in version v${item.majorVersion}.${item.minorVersion}`,
    ),
    term: normalizeWhitespace(item.name) || "Untitled roadmap item",
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
          definition:
            "The graduated product record that owns delivery after concept discovery is complete",
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
        definition:
          "A concept explicitly named during discovery that should keep one consistent meaning",
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
            `| **${sanitizeMarkdown(entry.term)}** | ${sanitizeMarkdown(entry.definition)} | ${sanitizeMarkdown(entry.aliasesToAvoid.join(", ") || "None")} |`,
        ),
      ].join("\n"),
    )
    .join("\n\n");

  const roadmapTerm = sanitizeMarkdown(source.roadmapItems[0]?.name || "Roadmap item");
  const audienceTerm = sanitizeMarkdown("Audience");
  const projectTerm = sanitizeMarkdown(productName || "Project");
  const ambiguityNotes = [
    '- "project" should mean the graduated execution record; use **Concept project** for the pre-graduation discovery artifact.',
    ...(!normalizeWhitespace(source.forWhomSummary)
      ? [
          "- The target **Audience** is still vague; tighten this term if a more precise actor name emerges.",
        ]
      : []),
    ...(!normalizeWhitespace(source.howSummary)
      ? [
          "- The delivery **Approach** is still broad; split it into narrower terms if the team starts overloading the word.",
        ]
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

    if (hasRequiredMarkdownSections(result.text)) {
      return markdown;
    }
  } catch {}

  return buildFallbackProjectUbiquitousLanguageMarkdown(source);
}
