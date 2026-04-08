import { generateText, NoObjectGeneratedError, Output } from "ai";
import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  getAccessibleConceptProject,
  getConceptProjectRoadmapItems,
  getConceptProjectViewerName,
} from "@/lib/concept-project/server";
import { getDb } from "@/lib/db";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ConceptProjectNameIdeasRouteProps = {
  params: Promise<{
    "concept-project-id": string;
  }>;
};

const responseSchema = z.object({
  names: z.array(z.string().trim().min(1).max(120)).length(10),
});

export async function POST(request: NextRequest, { params }: ConceptProjectNameIdeasRouteProps) {
  const session = await getWorkOSSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["concept-project-id"]: conceptProjectId } = await params;
  const db = getDb();
  const conceptProject = await getAccessibleConceptProject(viewer.id, conceptProjectId, db);

  if (!conceptProject) {
    return Response.json({ error: "Concept project not found" }, { status: 404 });
  }

  const [roadmapItems, viewerName] = await Promise.all([
    getConceptProjectRoadmapItems(conceptProject.roadmapId, db),
    getConceptProjectViewerName(viewer.id, db),
  ]);

  const roadmapText =
    roadmapItems.length > 0
      ? roadmapItems
          .map((item) => `- ${item.name}: ${item.description ?? "No description yet."}`)
          .join("\n")
      : "- No roadmap drafted yet.";

  try {
    const result = await generateText({
      model: "anthropic/claude-sonnet-4.6",
      output: Output.object({
        description: "Ten candidate product names for a concept project",
        name: "conceptProjectNameIdeas",
        schema: responseSchema,
      }),
      prompt: [
        "Generate 10 distinct product name ideas for a concept project.",
        "Keep each name concise, memorable, and product-ready.",
        "Do not use numbering, quotes, or explanations.",
        `User name: ${viewerName}`,
        `Current name: ${conceptProject.name?.trim() || "Untitled concept project"}`,
        `Description: ${conceptProject.description?.trim() || "No description yet."}`,
        `What summary: ${conceptProject.whatSummary?.trim() || "Unknown"}`,
        `For whom summary: ${conceptProject.forWhomSummary?.trim() || "Unknown"}`,
        `How summary: ${conceptProject.howSummary?.trim() || "Unknown"}`,
        "Roadmap:",
        roadmapText,
      ].join("\n"),
    });

    return Response.json(result.output);
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return Response.json(
        {
          error: "Failed to generate structured name ideas",
          rawText: error.text,
        },
        { status: 502 },
      );
    }

    throw error;
  }
}
